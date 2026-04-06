import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { Resend } from 'resend';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;
  private readonly resend: Resend | null;
  private readonly prices: Record<string, string>;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;
  private readonly fromEmail: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    this.stripe = secretKey && secretKey.length > 0
      ? new Stripe(secretKey, { httpClient: Stripe.createNodeHttpClient() })
      : null;

    const resendKey = process.env.RESEND_API_KEY;
    this.resend = resendKey ? new Resend(resendKey) : null;
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL', 'LegalAI <noreply@lasolutions.me>');

    this.prices = {
      basic: this.configService.get<string>('app.stripe.prices.basic', ''),
      pro: this.configService.get<string>('app.stripe.prices.pro', ''),
      unlimited: this.configService.get<string>('app.stripe.prices.unlimited', ''),
    };
    this.webhookSecret = this.configService.get<string>('app.stripe.webhookSecret', '');
    this.frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3000');

    if (!this.webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET não configurado — webhooks desativados');
    }
  }

  private getPlanFromPriceId(priceId: string): string | null {
    for (const [plan, id] of Object.entries(this.prices)) {
      if (id === priceId) return plan;
    }
    return null;
  }

  private assertStripe(): Stripe {
    if (!this.stripe) throw new ServiceUnavailableException('Pagamentos não configurados neste ambiente');
    return this.stripe;
  }

  private async getOrCreateCustomer(userId: string): Promise<string> {
    const stripe = this.assertStripe();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Stripe customer criado: ${customer.id} para user ${userId}`);
    return customer.id;
  }

  async createCheckoutSession(userId: string, planId: string): Promise<{ url: string }> {
    const stripe = this.assertStripe();
    const priceId = this.prices[planId];
    if (!priceId) throw new BadRequestException(`Plano inválido: ${planId}`);

    const customerId = await this.getOrCreateCustomer(userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl}/dashboard/planos?success=1`,
      cancel_url: `${this.frontendUrl}/dashboard/planos?canceled=1`,
      metadata: { userId, planId },
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    this.logger.log(`Checkout session criada: ${session.id} para user ${userId} plano ${planId}`);
    return { url: session.url! };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    const stripe = this.assertStripe();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.stripeCustomerId) {
      throw new BadRequestException('Você não possui uma assinatura ativa');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.frontendUrl}/dashboard/planos`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.webhookSecret) {
      this.logger.error('Webhook recebido mas STRIPE_WEBHOOK_SECRET não configurado — rejeitando');
      throw new BadRequestException('Webhooks não configurados');
    }

    const stripe = this.assertStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new BadRequestException('Assinatura do webhook inválida');
    }

    this.logger.log(`Webhook recebido: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.debug(`Evento ignorado: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId || !session.subscription) return;

    const subscription = await this.assertStripe().subscriptions.retrieve(session.subscription as string) as any;
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = this.getPlanFromPriceId(priceId) || 'basic';
    const periodEnd = subscription.current_period_end;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    this.logger.log(`Assinatura ativada: user=${userId} plan=${plan}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const userId = (subscription as any).metadata?.userId;
    if (!userId) return;

    const priceId = (subscription as any).items?.data?.[0]?.price?.id;
    const plan = this.getPlanFromPriceId(priceId);
    if (!plan) return;
    const periodEnd = (subscription as any).current_period_end;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        stripePriceId: priceId,
        planExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });

    this.logger.log(`Assinatura atualizada: user=${userId} plan=${plan}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const userId = (subscription as any).metadata?.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'trial',
        stripeSubscriptionId: null,
        stripePriceId: null,
        planExpiresAt: null,
      },
    });

    this.logger.log(`Assinatura cancelada: user=${userId} → trial`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const user = await this.prisma.user.findFirst({ where: { stripeCustomerId: customerId } });
    if (!user) {
      this.logger.warn(`handlePaymentFailed: usuário não encontrado para customer ${customerId}`);
      return;
    }

    this.logger.warn(`Pagamento falhou para user=${user.id} (${user.email})`);

    if (!this.resend) return;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject: 'Problema com seu pagamento — LegalAI',
        html: `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:28px 32px">
            <p style="margin:0;color:#fecaca;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">LegalAI · Pagamento</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">⚠️ Problema com seu pagamento</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#334155;font-size:15px">Olá, <strong>${user.name}</strong>.</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">
              Não conseguimos processar o pagamento da sua assinatura LegalAI.
              Para manter o acesso à plataforma, atualize suas informações de pagamento.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${this.frontendUrl}/dashboard/planos"
                 style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
                Atualizar forma de pagamento
              </a>
            </div>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">
              Se precisar de ajuda, entre em contato conosco respondendo este e-mail.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">LegalAI · legal.lasolutions.me</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
      this.logger.log(`Email de pagamento falho enviado para ${user.email}`);
    } catch (err: any) {
      this.logger.error(`Falha ao enviar email de pagamento falho: ${err?.message}`);
    }
  }
}

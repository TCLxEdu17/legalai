import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;
  private readonly prices: Record<string, string>;
  private readonly webhookSecret: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('app.stripe.secretKey', '');
    this.stripe = new Stripe(secretKey);
    this.prices = {
      basic: this.configService.get<string>('app.stripe.prices.basic', ''),
      pro: this.configService.get<string>('app.stripe.prices.pro', ''),
      unlimited: this.configService.get<string>('app.stripe.prices.unlimited', ''),
    };
    this.webhookSecret = this.configService.get<string>('app.stripe.webhookSecret', '');
    this.frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3000');
  }

  private getPlanFromPriceId(priceId: string): string | null {
    for (const [plan, id] of Object.entries(this.prices)) {
      if (id === priceId) return plan;
    }
    return null;
  }

  private async getOrCreateCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({
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
    const priceId = this.prices[planId];
    if (!priceId) throw new BadRequestException(`Plano inválido: ${planId}`);

    const customerId = await this.getOrCreateCustomer(userId);

    const session = await this.stripe.checkout.sessions.create({
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
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.stripeCustomerId) {
      throw new BadRequestException('Você não possui uma assinatura ativa');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${this.frontendUrl}/dashboard/planos`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
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
        this.logger.warn(`Pagamento falhou: ${(event.data.object as any).id}`);
        break;
      default:
        this.logger.debug(`Evento ignorado: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId || !session.subscription) return;

    const subscription = await this.stripe.subscriptions.retrieve(session.subscription as string) as any;
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
}

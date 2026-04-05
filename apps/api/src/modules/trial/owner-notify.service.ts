import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface TrialLeadData {
  prefix: string;
  name: string;
  contactEmail?: string;
  phone?: string;
  trialEmail: string;
  expiresAt: Date;
}

@Injectable()
export class OwnerNotifyService {
  private readonly logger = new Logger(OwnerNotifyService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly toEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.fromEmail = config.get<string>('RESEND_FROM_EMAIL', 'LegalAI <noreply@lasolutions.me>');
    this.toEmail   = config.get<string>('OWNER_EMAIL', 'edu@lasolutions.me');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('OwnerNotifyService: RESEND_API_KEY não configurado — e-mails desativados');
    }
  }

  async notifyNewTrial(lead: TrialLeadData): Promise<void> {
    if (!this.resend) return;

    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const expires = lead.expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const fullName = `${lead.prefix} ${lead.name}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: this.toEmail,
        subject: `🆕 Novo trial — ${fullName}`,
        html: buildEmailHtml({ ...lead, fullName, now, expires }),
      });
      this.logger.log(`Resend: e-mail enviado para ${this.toEmail} — lead: ${fullName}`);
    } catch (err: any) {
      this.logger.error(`Resend: falha ao enviar e-mail — ${err?.message}`);
    }
  }
}

// ── Template HTML ────────────────────────────────────────────────────────────
function buildEmailHtml(data: {
  fullName: string;
  contactEmail?: string;
  phone?: string;
  trialEmail: string;
  now: string;
  expires: string;
}): string {
  const row = (label: string, value: string, highlight = false) => `
    <tr>
      <td style="padding:8px 16px;color:#64748b;font-size:13px;width:130px;vertical-align:top">${label}</td>
      <td style="padding:8px 16px;font-size:13px;color:${highlight ? '#2563eb' : '#0f172a'};font-weight:${highlight ? '600' : '400'}">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px">
            <p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">LegalAI · Monitoramento</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">🆕 Novo trial criado</h1>
          </td>
        </tr>

        <!-- Dados do lead -->
        <tr>
          <td style="padding:24px 16px 8px">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
              <tr style="background:#f8fafc">
                <td colspan="2" style="padding:10px 16px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.5px;text-transform:uppercase">Dados do lead</td>
              </tr>
              ${row('Nome', data.fullName)}
              ${row('E-mail real', data.contactEmail ?? '—')}
              ${row('Telefone', data.phone ?? '—')}
              ${row('Login trial', data.trialEmail, true)}
              ${row('Criado em', data.now)}
              ${row('Expira em', data.expires)}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 32px 32px;text-align:center">
            <a href="https://wa.me/5513997708569?text=${encodeURIComponent(`Olá ${data.fullName}! Vi que você está testando o LegalAI. Posso te ajudar com alguma dúvida?`)}"
               style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
              💬 Entrar em contato no WhatsApp
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0;color:#94a3b8;font-size:12px">LegalAI · legal.lasolutions.me</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

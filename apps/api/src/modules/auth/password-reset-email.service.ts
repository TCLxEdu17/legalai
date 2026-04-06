import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.fromEmail = config.get<string>('RESEND_FROM_EMAIL', 'LegalAI <noreply@lasolutions.me>');
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY não configurado — emails de reset desativados');
    }
  }

  async sendResetEmail(email: string, name: string, token: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Reset email não enviado para ${email} — Resend não configurado`);
      return;
    }

    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Redefinir senha — LegalAI',
        html: buildResetEmailHtml({ name, resetUrl }),
      });
      this.logger.log(`Reset email enviado para ${email}`);
    } catch (err: any) {
      this.logger.error(`Falha ao enviar reset email: ${err?.message}`);
    }
  }
}

function buildResetEmailHtml(data: { name: string; resetUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 32px">
            <p style="margin:0;color:#bfdbfe;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase">LegalAI · Segurança</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700">Redefinir senha</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#334155;font-size:15px">Olá, <strong>${data.name}</strong>.</p>
            <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6">
              Recebemos uma solicitação para redefinir a senha da sua conta no LegalAI.
              Clique no botão abaixo para criar uma nova senha. O link expira em <strong>1 hora</strong>.
            </p>
            <div style="text-align:center;margin:28px 0">
              <a href="${data.resetUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
                Redefinir minha senha
              </a>
            </div>
            <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">
              Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanece a mesma.<br>
              Por segurança, este link expira em 1 hora e só pode ser usado uma vez.
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
</html>`;
}

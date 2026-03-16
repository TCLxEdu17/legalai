import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppMessageParams {
  clienteNome: string;
  numeroProcesso: string;
  movimento: string;
  data?: string;
}

export interface EmailBodyParams {
  clienteNome: string;
  numeroProcesso: string;
  movimento: string;
  data?: string;
  escritorioNome?: string;
}

@Injectable()
export class NotificacoesClientesService {
  private readonly logger = new Logger(NotificacoesClientesService.name);

  buildWhatsAppMessage(params: WhatsAppMessageParams): string {
    const { clienteNome, numeroProcesso, movimento, data } = params;
    const dataStr = data || new Date().toLocaleDateString('pt-BR');
    return (
      `Olá, ${clienteNome}! 👋\n\n` +
      `Temos uma atualização importante no seu processo:\n\n` +
      `📋 *Processo:* ${numeroProcesso}\n` +
      `📅 *Data:* ${dataStr}\n` +
      `⚖️ *Movimento:* ${movimento}\n\n` +
      `Em caso de dúvidas, entre em contato com seu advogado.\n\n` +
      `_Esta é uma mensagem automática._`
    );
  }

  buildEmailBody(params: EmailBodyParams): string {
    const {
      clienteNome,
      numeroProcesso,
      movimento,
      data,
      escritorioNome = 'Escritório de Advocacia',
    } = params;
    const dataStr = data || new Date().toLocaleDateString('pt-BR');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Atualização Processual</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <h2 style="color: #1a1a2e; margin-top: 0;">Atualização do seu Processo</h2>
    <p>Prezado(a) <strong>${clienteNome}</strong>,</p>
    <p>Informamos que houve uma movimentação no seu processo:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px; background: #f8f9fa; border: 1px solid #dee2e6; font-weight: bold; width: 140px;">Processo</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${numeroProcesso}</td>
      </tr>
      <tr>
        <td style="padding: 8px; background: #f8f9fa; border: 1px solid #dee2e6; font-weight: bold;">Data</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;">${dataStr}</td>
      </tr>
      <tr>
        <td style="padding: 8px; background: #f8f9fa; border: 1px solid #dee2e6; font-weight: bold;">Movimento</td>
        <td style="padding: 8px; border: 1px solid #dee2e6;"><strong>${movimento}</strong></td>
      </tr>
    </table>
    <p>Em caso de dúvidas, entre em contato com nosso escritório.</p>
    <p style="margin-bottom: 0;">Atenciosamente,<br><strong>${escritorioNome}</strong></p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #dee2e6;">
    <p style="font-size: 12px; color: #6c757d; margin: 0;">Esta é uma mensagem automática enviada pelo sistema LegalAI. Por favor, não responda este e-mail.</p>
  </div>
</body>
</html>`;
  }

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    const zapiUrl = process.env.ZAPI_URL;
    const zapiToken = process.env.ZAPI_TOKEN;

    if (!zapiUrl || !zapiToken) {
      this.logger.log(`[Z-API STUB] Would send WhatsApp to ${phone}: ${message.substring(0, 60)}...`);
      return;
    }

    try {
      const response = await fetch(`${zapiUrl}/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': zapiToken,
        },
        body: JSON.stringify({ phone, message }),
      });
      if (!response.ok) {
        this.logger.warn(`Z-API error: ${response.status}`);
      }
    } catch (err) {
      this.logger.error('Failed to send WhatsApp via Z-API', err);
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.log(`[SMTP STUB] Would send email to ${to} | Subject: ${subject}`);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'LegalAI'}" <${smtpUser}>`,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error('Failed to send email via SMTP', err);
    }
  }
}

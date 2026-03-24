import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class RadarEmailService {
  private readonly logger = new Logger(RadarEmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP não configurado — emails de radar desativados');
    }
  }

  async sendAlert(params: {
    to: string;
    radarTitle: string;
    documentTitle: string;
    tribunal?: string;
    similarity: number;
    summary?: string;
    alertUrl: string;
  }): Promise<void> {
    if (!this.transporter) return;

    const from = this.config.get<string>('SMTP_FROM', 'LegalAI <no-reply@legalai.com.br>');
    const similarityPct = Math.round(params.similarity * 100);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e27d2; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">⚖️ Radar: nova decisão relevante</h2>
        </div>
        <div style="background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0;">
          <p style="color: #333;"><strong>Radar:</strong> ${params.radarTitle}</p>
          <p style="color: #333;"><strong>Decisão:</strong> ${params.documentTitle}</p>
          ${params.tribunal ? `<p style="color: #333;"><strong>Tribunal:</strong> ${params.tribunal}</p>` : ''}
          <p style="color: #333;"><strong>Similaridade:</strong> ${similarityPct}%</p>
          ${params.summary ? `<div style="background: #fff; border-left: 3px solid #1e27d2; padding: 12px; margin: 16px 0;"><p style="margin: 0; color: #555;">${params.summary}</p></div>` : ''}
          <a href="${params.alertUrl}"
             style="display: inline-block; background: #1e27d2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">
            Ver decisão completa
          </a>
        </div>
        <div style="background: #eee; padding: 12px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="font-size: 12px; color: #888; margin: 0;">LegalAI — Assistente Jurídico com IA</p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: `[Radar] Nova decisão: ${params.radarTitle} (${similarityPct}% similaridade)`,
        html,
      });
      this.logger.log(`Email de alerta enviado para ${params.to}`);
    } catch (err) {
      this.logger.error(`Falha ao enviar email de alerta para ${params.to}`, err);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
  private readonly botToken: string | undefined;
  private readonly chatId: string | undefined;
  private readonly webhookUrl: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.botToken  = config.get<string>('TELEGRAM_BOT_TOKEN');
    this.chatId    = config.get<string>('TELEGRAM_CHAT_ID');
    this.webhookUrl = config.get<string>('OWNER_NOTIFY_WEBHOOK_URL');
  }

  async notifyNewTrial(lead: TrialLeadData): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.botToken && this.chatId) {
      promises.push(this.sendTelegram(lead));
    }

    if (this.webhookUrl) {
      promises.push(this.sendWebhook(lead));
    }

    if (promises.length === 0) {
      this.logger.warn('OwnerNotifyService: nenhum canal configurado (TELEGRAM_BOT_TOKEN / OWNER_NOTIFY_WEBHOOK_URL)');
      return;
    }

    await Promise.allSettled(promises);
  }

  private async sendTelegram(lead: TrialLeadData): Promise<void> {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const lines = [
      `🆕 *Novo Trial — LegalAI*`,
      ``,
      `👤 ${lead.prefix} ${lead.name}`,
      lead.contactEmail ? `📧 ${lead.contactEmail}` : `📧 _não informado_`,
      lead.phone        ? `📱 ${lead.phone}`        : `📱 _não informado_`,
      ``,
      `🔑 Login: \`${lead.trialEmail}\``,
      `⏰ Criado em: ${now}`,
      `⌛ Expira: ${lead.expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ];

    const text = lines.join('\n');

    try {
      await axios.post(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        { chat_id: this.chatId, text, parse_mode: 'Markdown' },
        { timeout: 8000 },
      );
      this.logger.log('Telegram: notificação enviada ao owner');
    } catch (err: any) {
      this.logger.error(`Telegram: falha ao notificar — ${err?.message}`);
    }
  }

  private async sendWebhook(lead: TrialLeadData): Promise<void> {
    try {
      await axios.post(
        this.webhookUrl!,
        {
          event: 'trial.created',
          data: {
            prefix: lead.prefix,
            name: lead.name,
            contactEmail: lead.contactEmail ?? null,
            phone: lead.phone ?? null,
            trialEmail: lead.trialEmail,
            expiresAt: lead.expiresAt.toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
        { timeout: 8000 },
      );
      this.logger.log('Webhook: notificação enviada ao owner');
    } catch (err: any) {
      this.logger.error(`Webhook: falha ao notificar — ${err?.message}`);
    }
  }
}

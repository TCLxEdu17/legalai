import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserWebhooks(userId: string) {
    return this.prisma.webhook.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async createWebhook(userId: string, url: string, events: string[]) {
    const secret = crypto.randomBytes(32).toString('hex');
    return this.prisma.webhook.create({
      data: { userId, url, events, secret },
    });
  }

  async deleteWebhook(userId: string, id: string) {
    const wh = await this.prisma.webhook.findFirst({ where: { id, userId } });
    if (!wh) throw new NotFoundException('Webhook não encontrado');
    await this.prisma.webhook.delete({ where: { id } });
  }

  async dispatch(event: string, payload: Record<string, any>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { isActive: true, events: { has: event } },
    });

    for (const wh of webhooks) {
      let delivered = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
          const sig = crypto.createHmac('sha256', wh.secret).update(body).digest('hex');
          await axios.post(wh.url, body, {
            headers: {
              'Content-Type': 'application/json',
              'X-LegalAI-Signature': `sha256=${sig}`,
              'X-LegalAI-Event': event,
            },
            timeout: 10000,
          });
          this.logger.log(`Webhook ${wh.id} disparado para evento ${event} (tentativa ${attempt})`);
          delivered = true;
          break;
        } catch (err) {
          if (attempt < 3) {
            const delayMs = attempt * 2000;
            this.logger.warn(`Falha no webhook ${wh.id} (tentativa ${attempt}/${3}), retry em ${delayMs}ms: ${err.message}`);
            await new Promise((r) => setTimeout(r, delayMs));
          } else {
            this.logger.error(`Webhook ${wh.id} falhou definitivamente após ${attempt} tentativas: ${err.message}`);
          }
        }
      }
    }
  }
}

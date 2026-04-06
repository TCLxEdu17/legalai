import { Injectable, Logger, Inject } from '@nestjs/common';
import { AI_PROVIDER_TOKEN, IAIProvider } from '../rag/providers/ai-provider.interface';
import { PrismaService } from '../../prisma/prisma.service';

export interface PredictionPromptParams {
  area: string;
  pedido: string;
  tribunal: string;
  resumoFatos?: string;
  jurisprudencias?: string[];
}

export interface PredictionResult {
  probabilidade: number;
  prazoMedio: number;
  fundamento?: string;
  pontosFavoraveis?: string[];
  pontosContrarios?: string[];
  jurisprudenciasRelevantes?: string[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
    private readonly prisma: PrismaService,
  ) {}

  buildPredictionPrompt(params: PredictionPromptParams): string {
    const { area, pedido, tribunal, resumoFatos, jurisprudencias } = params;

    let prompt = `Você é um especialista em análise preditiva jurídica.

Analise a seguinte demanda e forneça uma estimativa de desfecho:

**Área do Direito:** ${area}
**Tribunal:** ${tribunal}
**Pedido Principal:** ${pedido}`;

    if (resumoFatos) {
      prompt += `\n**Resumo dos Fatos:** ${resumoFatos}`;
    }

    if (jurisprudencias && jurisprudencias.length > 0) {
      prompt += `\n\n**Jurisprudências Relevantes Encontradas:**\n${jurisprudencias.join('\n')}`;
    }

    prompt += `

Com base na jurisprudência consolidada do ${tribunal} e nos dados fornecidos, responda APENAS com um JSON válido, sem texto adicional, sem markdown, sem explicações:
{
  "probabilidade": <número inteiro de 0 a 100>,
  "prazoMedio": <número inteiro de meses>,
  "fundamento": "<fundamento jurídico em 1-2 frases>",
  "pontosFavoraveis": ["<ponto1>", "<ponto2>"],
  "pontosContrarios": ["<ponto1>", "<ponto2>"],
  "jurisprudenciasRelevantes": ["<ementa resumida 1>", "<ementa resumida 2>"]
}`;

    return prompt;
  }

  parsePredictionResult(raw: string): PredictionResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      const parsed = JSON.parse(jsonStr);

      return {
        probabilidade: typeof parsed.probabilidade === 'number' ? parsed.probabilidade : 50,
        prazoMedio: typeof parsed.prazoMedio === 'number' ? parsed.prazoMedio : 12,
        fundamento: parsed.fundamento || '',
        pontosFavoraveis: Array.isArray(parsed.pontosFavoraveis) ? parsed.pontosFavoraveis : [],
        pontosContrarios: Array.isArray(parsed.pontosContrarios) ? parsed.pontosContrarios : [],
        jurisprudenciasRelevantes: Array.isArray(parsed.jurisprudenciasRelevantes)
          ? parsed.jurisprudenciasRelevantes
          : [],
      };
    } catch {
      this.logger.warn('Failed to parse prediction result JSON');
      return {
        probabilidade: 50,
        prazoMedio: 12,
        fundamento: 'Análise indisponível',
        pontosFavoraveis: [],
        pontosContrarios: [],
        jurisprudenciasRelevantes: [],
      };
    }
  }

  async trackEvent(
    userId: string,
    payload: { event: string; page?: string; element?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.prisma.userEvent.create({
        data: {
          userId,
          event: payload.event,
          page: payload.page ?? null,
          element: payload.element ?? null,
          metadata: (payload.metadata ?? {}) as any,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to track user event', err);
    }
  }

  async getUserEngagementMetrics() {
    // Últimos 90 dias — suficiente para dashboards sem sobrecarregar
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        email: { not: 'system@legalai.internal' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        userEvents: {
          where: { createdAt: { gte: since } },
          select: { event: true, page: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const events = u.userEvents;
      const pageViews = events.filter((e) => e.event === 'page_view').length;
      const clicks = events.filter((e) => e.event === 'click').length;
      const lastSeen = events[0]?.createdAt ?? null;

      const activeDays = new Set(
        events.map((e) => e.createdAt.toISOString().split('T')[0]),
      ).size;

      // Top 3 páginas por frequência
      const pageCounts: Record<string, number> = {};
      events
        .filter((e) => e.event === 'page_view' && e.page)
        .forEach((e) => { pageCounts[e.page!] = (pageCounts[e.page!] ?? 0) + 1; });
      const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([page]) => page);

      // Breakdown por feature (tudo que não é page_view/click)
      const featureUsage: Record<string, number> = {};
      events
        .filter((e) => e.event !== 'page_view' && e.event !== 'click')
        .forEach((e) => { featureUsage[e.event] = (featureUsage[e.event] ?? 0) + 1; });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        pageViews,
        clicks,
        totalEvents: events.length,
        activeDays,
        lastSeen,
        topPages,
        featureUsage,
        memberSince: u.createdAt,
      };
    });
  }

  async getPrediction(params: PredictionPromptParams): Promise<PredictionResult> {
    try {
      const prompt = this.buildPredictionPrompt(params);
      const result = await this.aiProvider.generateChatCompletion(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1024 },
      );
      return this.parsePredictionResult(result.content);
    } catch (err) {
      this.logger.error('Failed to get AI prediction', err);
      return {
        probabilidade: 50,
        prazoMedio: 12,
        fundamento: 'Não foi possível gerar análise preditiva no momento.',
        pontosFavoraveis: [],
        pontosContrarios: [],
        jurisprudenciasRelevantes: [],
      };
    }
  }
}

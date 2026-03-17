import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// USD cost per 1M tokens (input / output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':                  { input: 2.50,  output: 10.00 },
  'gpt-4o-2024-08-06':       { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':             { input: 0.15,  output: 0.60  },
  'gpt-4o-mini-2024-07-18':  { input: 0.15,  output: 0.60  },
  'gpt-4-turbo':             { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo':           { input: 0.50,  output: 1.50  },
  'text-embedding-3-small':  { input: 0.02,  output: 0     },
  'text-embedding-3-large':  { input: 0.13,  output: 0     },
  'claude-opus-4-6':         { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':       { input: 3.00,  output: 15.00 },
  'claude-haiku-4-5':        { input: 0.80,  output: 4.00  },
};

function calcCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { input: 0, output: 0 };
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsageSummary(userId: string, userRole: string) {
    const where = userRole === 'ADMIN' ? {} : { userId };

    const apiKeys = await this.prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        totalRequests: true,
        requestsThisMonth: true,
        tokensThisMonth: true,
        docsIndexed: true,
        usageResetAt: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { apiKeys };
  }

  async getTokenUsageSummary(userId: string, userRole: string) {
    const isAdmin = userRole === 'ADMIN';
    const userFilter = isAdmin ? {} : { userId };
    const userIdFilter = isAdmin ? undefined : userId;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [aggToday, aggMonth, aggAll] = await Promise.all([
      this.prisma.usageLog.aggregate({
        where: { ...userFilter, createdAt: { gte: todayStart } },
        _sum: { tokensUsed: true, costUsd: true },
        _count: { id: true },
      }),
      this.prisma.usageLog.aggregate({
        where: { ...userFilter, createdAt: { gte: monthStart } },
        _sum: { tokensUsed: true, costUsd: true },
        _count: { id: true },
      }),
      this.prisma.usageLog.aggregate({
        where: userFilter,
        _sum: { tokensUsed: true, costUsd: true },
      }),
    ]);

    const endpointGroups = await this.prisma.usageLog.groupBy({
      by: ['endpoint'],
      where: userFilter,
      _count: { id: true },
      _sum: { tokensUsed: true, costUsd: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const requestsByEndpoint = endpointGroups.map((g) => ({
      endpoint: g.endpoint,
      count: g._count.id,
      tokens: g._sum.tokensUsed ?? 0,
      costUsd: Number((g._sum.costUsd ?? 0).toFixed(6)),
    }));

    type DailyRow = { date: Date; tokens: bigint; requests: bigint; cost: number };
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    let dailyRaw: DailyRow[];
    if (isAdmin) {
      dailyRaw = await this.prisma.$queryRaw<DailyRow[]>`
        SELECT
          DATE_TRUNC('day', created_at) AS date,
          COALESCE(SUM(tokens_used), 0)::bigint AS tokens,
          COUNT(id)::bigint AS requests,
          COALESCE(SUM(cost_usd), 0)::float AS cost
        FROM usage_logs
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `;
    } else {
      dailyRaw = await this.prisma.$queryRaw<DailyRow[]>`
        SELECT
          DATE_TRUNC('day', created_at) AS date,
          COALESCE(SUM(tokens_used), 0)::bigint AS tokens,
          COUNT(id)::bigint AS requests,
          COALESCE(SUM(cost_usd), 0)::float AS cost
        FROM usage_logs
        WHERE created_at >= ${sevenDaysAgo}
          AND user_id = ${userIdFilter}::uuid
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `;
    }

    const dailyUsage = dailyRaw.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      tokens: Number(r.tokens),
      requests: Number(r.requests),
      costUsd: Number(Number(r.cost).toFixed(6)),
    }));

    return {
      totalTokensToday: aggToday._sum.tokensUsed ?? 0,
      totalTokensThisMonth: aggMonth._sum.tokensUsed ?? 0,
      totalTokensAllTime: aggAll._sum.tokensUsed ?? 0,
      totalRequestsToday: aggToday._count.id,
      totalRequestsThisMonth: aggMonth._count.id,
      totalCostUsdToday: Number((aggToday._sum.costUsd ?? 0).toFixed(4)),
      totalCostUsdThisMonth: Number((aggMonth._sum.costUsd ?? 0).toFixed(4)),
      totalCostUsdAllTime: Number((aggAll._sum.costUsd ?? 0).toFixed(4)),
      requestsByEndpoint,
      dailyUsage,
    };
  }

  /**
   * Track an AI completion call.
   * Fire-and-forget: call without await to avoid blocking the user response.
   */
  async trackAiUsage(
    userId: string,
    endpoint: string,
    promptTokens: number,
    completionTokens: number,
    model: string,
    durationMs = 0,
  ) {
    const tokensUsed = promptTokens + completionTokens;
    const costUsd = calcCostUsd(model, promptTokens, completionTokens);

    try {
      await this.prisma.usageLog.create({
        data: {
          userId,
          endpoint,
          tokensUsed,
          promptTokens,
          completionTokens,
          costUsd,
          model,
          durationMs,
          statusCode: 200,
        },
      });
    } catch (err) {
      this.logger.warn(`trackAiUsage failed: ${(err as Error)?.message}`);
    }

    this.logger.debug(
      `AI usage tracked: endpoint=${endpoint} model=${model} tokens=${tokensUsed} cost=$${costUsd.toFixed(6)}`,
    );
  }

  async trackApiUsage(
    apiKeyId: string,
    userId: string,
    endpoint: string,
    tokensUsed: number,
    durationMs: number,
    statusCode: number,
  ) {
    await this.prisma.usageLog.create({
      data: {
        apiKeyId,
        userId,
        endpoint,
        tokensUsed,
        durationMs,
        statusCode,
      },
    });

    if (apiKeyId) {
      const apiKey = await this.prisma.apiKey.findUnique({
        where: { id: apiKeyId },
        select: { usageResetAt: true, requestsThisMonth: true, tokensThisMonth: true },
      });

      if (apiKey) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const shouldReset = !apiKey.usageResetAt || apiKey.usageResetAt < startOfMonth;

        if (shouldReset) {
          await this.prisma.apiKey.update({
            where: { id: apiKeyId },
            data: {
              totalRequests: { increment: 1 },
              requestsThisMonth: 1,
              tokensThisMonth: tokensUsed,
              usageResetAt: startOfMonth,
            },
          });
        } else {
          await this.prisma.apiKey.update({
            where: { id: apiKeyId },
            data: {
              totalRequests: { increment: 1 },
              requestsThisMonth: { increment: 1 },
              tokensThisMonth: { increment: tokensUsed },
            },
          });
        }
      }
    }

    this.logger.debug(`Tracked API usage: endpoint=${endpoint}, tokens=${tokensUsed}, status=${statusCode}`);
  }
}

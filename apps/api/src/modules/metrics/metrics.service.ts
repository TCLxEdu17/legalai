import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
        _sum: { tokensUsed: true },
        _count: { id: true },
      }),
      this.prisma.usageLog.aggregate({
        where: { ...userFilter, createdAt: { gte: monthStart } },
        _sum: { tokensUsed: true },
        _count: { id: true },
      }),
      this.prisma.usageLog.aggregate({
        where: userFilter,
        _sum: { tokensUsed: true },
      }),
    ]);

    const endpointGroups = await this.prisma.usageLog.groupBy({
      by: ['endpoint'],
      where: userFilter,
      _count: { id: true },
      _sum: { tokensUsed: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const requestsByEndpoint = endpointGroups.map((g) => ({
      endpoint: g.endpoint,
      count: g._count.id,
      tokens: g._sum.tokensUsed ?? 0,
    }));

    type DailyRow = { date: Date; tokens: bigint; requests: bigint };
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    let dailyRaw: DailyRow[];
    if (isAdmin) {
      dailyRaw = await this.prisma.$queryRaw<DailyRow[]>`
        SELECT
          DATE_TRUNC('day', created_at) AS date,
          COALESCE(SUM(tokens_used), 0)::bigint AS tokens,
          COUNT(id)::bigint AS requests
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
          COUNT(id)::bigint AS requests
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
    }));

    return {
      totalTokensToday: aggToday._sum.tokensUsed ?? 0,
      totalTokensThisMonth: aggMonth._sum.tokensUsed ?? 0,
      totalTokensAllTime: aggAll._sum.tokensUsed ?? 0,
      totalRequestsToday: aggToday._count.id,
      totalRequestsThisMonth: aggMonth._count.id,
      requestsByEndpoint,
      dailyUsage,
    };
  }

  async trackApiUsage(
    apiKeyId: string,
    userId: string,
    endpoint: string,
    tokensUsed: number,
    durationMs: number,
    statusCode: number,
  ) {
    // Create usage log entry
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

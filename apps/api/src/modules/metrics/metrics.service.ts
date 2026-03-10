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

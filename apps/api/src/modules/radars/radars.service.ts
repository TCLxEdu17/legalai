import {
  Injectable, Logger, NotFoundException, ForbiddenException, Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from '../rag/providers/ai-provider.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { RadarEmailService } from './radar-email.service';
import { CreateRadarDto } from './dto/create-radar.dto';
import { UpdateRadarDto } from './dto/update-radar.dto';

@Injectable()
export class RadarsService {
  private readonly logger = new Logger(RadarsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
    private readonly notificationsService: NotificationsService,
    private readonly radarEmailService: RadarEmailService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateRadarDto, userId: string) {
    const { embedding } = await this.aiProvider.generateEmbedding(dto.thesisText);

    const radar = await this.prisma.radar.create({
      data: {
        userId,
        title: dto.title,
        thesisText: dto.thesisText,
        threshold: dto.threshold ?? 0.8,
        caseId: dto.caseId ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;
    await this.prisma.$executeRawUnsafe(
      `UPDATE radars SET thesis_embedding = ${embeddingLiteral} WHERE id = '${radar.id}'::uuid`,
    );

    return radar;
  }

  async list(userId: string) {
    return this.prisma.radar.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        case: { select: { id: true, title: true } },
        _count: { select: { alerts: { where: { readAt: null } } } },
      },
    });
  }

  async findOne(id: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({
      where: { id },
      include: { case: { select: { id: true, title: true } } },
    });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();
    return radar;
  }

  async update(id: string, dto: UpdateRadarDto, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.radar.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.thesisText && { thesisText: dto.thesisText }),
        ...(dto.threshold !== undefined && { threshold: dto.threshold }),
        ...(dto.caseId !== undefined && { caseId: dto.caseId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    if (dto.thesisText) {
      const { embedding } = await this.aiProvider.generateEmbedding(dto.thesisText);
      const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;
      await this.prisma.$executeRawUnsafe(
        `UPDATE radars SET thesis_embedding = ${embeddingLiteral} WHERE id = '${id}'::uuid`,
      );
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();
    await this.prisma.radar.delete({ where: { id } });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.radarAlert.count({
      where: { radar: { userId }, readAt: null },
    });
  }

  /**
   * Chamado pelo IngestionService após indexar um documento.
   * Fire-and-forget — nunca lança exceção para o caller.
   */
  async listAlerts(radarId: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id: radarId } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    return this.prisma.radarAlert.findMany({
      where: { radarId },
      include: {
        document: {
          select: {
            id: true, title: true, tribunal: true, processNumber: true,
            judgmentDate: true, summary: true, cleanedText: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAlertRead(radarId: string, alertId: string, userId: string) {
    const radar = await this.prisma.radar.findUnique({ where: { id: radarId } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    const alert = await this.prisma.radarAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert || alert.radarId !== radarId) throw new NotFoundException('Alerta não encontrado');

    await this.prisma.radarAlert.update({
      where: { id: alertId },
      data: { readAt: new Date() },
    });
  }

  async generateImpactAnalysis(radarId: string, alertId: string, userId: string): Promise<string> {
    const radar = await this.prisma.radar.findUnique({ where: { id: radarId } });
    if (!radar) throw new NotFoundException('Radar não encontrado');
    if (radar.userId !== userId) throw new ForbiddenException();

    const alert = await this.prisma.radarAlert.findUnique({
      where: { id: alertId },
      include: { document: { select: { cleanedText: true, title: true } } },
    });
    if (!alert || alert.radarId !== radarId) throw new NotFoundException('Alerta não encontrado');

    if (alert.impactAnalysis) return alert.impactAnalysis;

    const excerpt = alert.document.cleanedText?.slice(0, 4000) ?? '';
    const { content } = await this.aiProvider.generateChatCompletion([
      {
        role: 'user',
        content: `Tese monitorada: "${radar.thesisText}"\n\nDecisão:\n${excerpt}\n\nAnalise o impacto desta decisão para advogados que trabalham com a tese acima. Seja direto e prático, em 4-5 frases.`,
      },
    ], { maxTokens: 400, temperature: 0.4 });

    await this.prisma.radarAlert.update({
      where: { id: alertId },
      data: { impactAnalysis: content },
    });

    return content;
  }

  async checkDocument(documentId: string): Promise<void> {
    const sql = `
      SELECT
        r.id           AS radar_id,
        r.user_id,
        u.email        AS user_email,
        r.title,
        r.threshold,
        MAX(1 - (jc.embedding <=> r.thesis_embedding)) AS max_similarity
      FROM radars r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN jurisprudence_chunks jc ON jc.document_id = $1::uuid
      WHERE
        r.is_active = true
        AND r.thesis_embedding IS NOT NULL
        AND jc.embedding IS NOT NULL
      GROUP BY r.id, r.user_id, u.email, r.title, r.threshold
      HAVING MAX(1 - (jc.embedding <=> r.thesis_embedding)) >= r.threshold
    `;

    type RadarMatch = {
      radar_id: string;
      user_id: string;
      user_email: string;
      title: string;
      threshold: number;
      max_similarity: number;
    };

    let matches: RadarMatch[];
    try {
      matches = await this.prisma.$queryRawUnsafe<RadarMatch[]>(sql, documentId);
    } catch (err) {
      this.logger.error(`checkDocument: erro na query pgvector para doc ${documentId}`, err);
      return;
    }

    if (!matches.length) return;

    this.logger.log(`checkDocument: ${matches.length} radares matcharam para doc ${documentId}`);

    for (const match of matches) {
      try {
        let alert = await this.prisma.radarAlert.create({
          data: {
            radarId: match.radar_id,
            documentId,
            similarity: Number(match.max_similarity),
          },
        });

        // Gerar resumo automaticamente (LLM)
        let doc: { title: string; cleanedText: string | null; tribunal: string | null; judgmentDate: Date | null } | null = null;
        try {
          doc = await this.prisma.jurisprudenceDocument.findUnique({
            where: { id: documentId },
            select: { title: true, cleanedText: true, tribunal: true, judgmentDate: true },
          });

          if (doc?.cleanedText) {
            const excerpt = doc.cleanedText.slice(0, 3000);
            const { content } = await this.aiProvider.generateChatCompletion([
              {
                role: 'user',
                content: `Resuma em 3-4 frases a seguinte decisão jurídica, focando nos pontos mais relevantes para advogados:\n\n${excerpt}`,
              },
            ], { maxTokens: 300, temperature: 0.3 });

            await this.prisma.radarAlert.update({
              where: { id: alert.id },
              data: { summary: content },
            });

            alert = { ...alert, summary: content };
          }
        } catch (summaryErr) {
          this.logger.warn(`checkDocument: falha ao gerar resumo para alerta ${alert.id}`, summaryErr);
        }

        // Notificar in-app
        await this.notificationsService.createForUser(
          match.user_id,
          `Radar "${match.title}" — nova decisão relevante`,
          `Similaridade: ${Math.round(Number(match.max_similarity) * 100)}%`,
          `/dashboard/radares/${match.radar_id}`,
        );

        // Email notification (fire-and-forget)
        if (doc) {
          this.radarEmailService.sendAlert({
            to: match.user_email,
            radarTitle: match.title,
            documentTitle: doc.title,
            tribunal: doc.tribunal ?? undefined,
            similarity: Number(match.max_similarity),
            summary: alert.summary ?? undefined,
            alertUrl: `${this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')}/dashboard/radares/${match.radar_id}`,
          }).catch(() => {});
        }
      } catch (err: any) {
        if (err?.code === 'P2002') {
          this.logger.debug(`checkDocument: alerta duplicado ignorado para radar ${match.radar_id}`);
        } else {
          this.logger.error(`checkDocument: erro ao criar alerta para radar ${match.radar_id}`, err);
        }
      }
    }
  }
}

import {
  Injectable, Logger, NotFoundException, ForbiddenException, Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from '../rag/providers/ai-provider.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRadarDto } from './dto/create-radar.dto';
import { UpdateRadarDto } from './dto/update-radar.dto';

@Injectable()
export class RadarsService {
  private readonly logger = new Logger(RadarsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
    private readonly notificationsService: NotificationsService,
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
}

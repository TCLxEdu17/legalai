import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSourceDto) {
    const source = await this.prisma.externalSource.create({
      data: {
        name: dto.name,
        description: dto.description,
        baseUrl: dto.baseUrl,
        sourceType: dto.sourceType,
        parserType: dto.sourceType,
        scheduleCron: dto.scheduleCron || '0 2 * * *',
        isActive: dto.isActive ?? true,
        configJson: dto.configJson || {},
      },
    });

    this.logger.log(`Fonte criada: ${source.name} (${source.id})`);
    return source;
  }

  async findAll() {
    const sources = await this.prisma.externalSource.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Enriquecer com stats de jobs
    const enriched = await Promise.all(
      sources.map(async (s: typeof sources[0]) => {
        const [totalJobs, lastJob] = await Promise.all([
          this.prisma.ingestionJob.count({ where: { sourceId: s.id } }),
          this.prisma.ingestionJob.findFirst({
            where: { sourceId: s.id },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              itemsIndexed: true,
              itemsFound: true,
              startedAt: true,
              finishedAt: true,
              errorMessage: true,
            },
          }),
        ]);
        return { ...s, totalJobs, lastJob };
      }),
    );

    return enriched;
  }

  async findById(id: string) {
    const source = await this.prisma.externalSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException(`Fonte ${id} não encontrada`);
    return source;
  }

  async update(id: string, dto: UpdateSourceDto) {
    await this.findById(id);

    const updated = await this.prisma.externalSource.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.baseUrl && { baseUrl: dto.baseUrl }),
        ...(dto.sourceType && { sourceType: dto.sourceType, parserType: dto.sourceType }),
        ...(dto.scheduleCron && { scheduleCron: dto.scheduleCron }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.configJson && { configJson: dto.configJson }),
      },
    });

    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.externalSource.delete({ where: { id } });
    this.logger.log(`Fonte ${id} removida`);
  }

  async getJobs(sourceId: string, page = 1, limit = 20) {
    await this.findById(sourceId);

    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where: { sourceId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.ingestionJob.count({ where: { sourceId } }),
    ]);

    return {
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

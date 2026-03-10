import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface ListDocumentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  tribunal?: string;
  theme?: string;
  status?: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async findAll(query: ListDocumentsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { tribunal: { contains: query.search, mode: 'insensitive' } },
        { theme: { contains: query.search, mode: 'insensitive' } },
        { processNumber: { contains: query.search, mode: 'insensitive' } },
        { relator: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tribunal) {
      where.tribunal = { contains: query.tribunal, mode: 'insensitive' };
    }

    if (query.theme) {
      where.theme = { contains: query.theme, mode: 'insensitive' };
    }

    if (query.status) {
      where.processingStatus = query.status;
    }

    const [documents, total] = await Promise.all([
      this.prisma.jurisprudenceDocument.findMany({
        where,
        select: {
          id: true,
          title: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          tribunal: true,
          processNumber: true,
          relator: true,
          judgmentDate: true,
          theme: true,
          keywords: true,
          uploadStatus: true,
          processingStatus: true,
          processingError: true,
          chunkCount: true,
          createdAt: true,
          updatedAt: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jurisprudenceDocument.count({ where }),
    ]);

    return {
      data: documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async findById(id: string) {
    const document = await this.prisma.jurisprudenceDocument.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Documento ${id} não encontrado`);
    }

    return document;
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const document = await this.findById(id);

    // Apenas admin pode deletar documentos de outros usuários
    if (document.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Sem permissão para deletar este documento');
    }

    // Deletar arquivo do storage (R2 ou disco local)
    if (document.filePath) {
      await this.storageService.deleteFile(document.filePath);
    }

    // Deletar registro (chunks são deletados em cascade pelo Prisma)
    await this.prisma.jurisprudenceDocument.delete({ where: { id } });

    this.logger.log(`Documento ${id} deletado por ${userId}`);
  }

  async getStats() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, byStatus, byTribunal, totalChunks, byTheme, newThisWeek, newThisMonth, bySource] =
      await Promise.all([
        this.prisma.jurisprudenceDocument.count(),
        this.prisma.jurisprudenceDocument.groupBy({ by: ['processingStatus'], _count: true }),
        this.prisma.jurisprudenceDocument.groupBy({
          by: ['tribunal'],
          _count: true,
          orderBy: { _count: { tribunal: 'desc' } },
          take: 10,
        }),
        this.prisma.jurisprudenceChunk.count(),
        this.prisma.jurisprudenceDocument.groupBy({
          by: ['theme'],
          _count: true,
          orderBy: { _count: { theme: 'desc' } },
          take: 12,
          where: { theme: { not: null }, processingStatus: 'INDEXED' },
        }),
        this.prisma.jurisprudenceDocument.count({
          where: { processingStatus: 'INDEXED', createdAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.jurisprudenceDocument.count({
          where: { processingStatus: 'INDEXED', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.prisma.jurisprudenceDocument.groupBy({ by: ['sourceType'], _count: true }),
      ]);

    return {
      totalDocuments: total,
      totalChunks,
      byStatus: byStatus.reduce((acc: Record<string, number>, s: any) => {
        acc[s.processingStatus] = s._count;
        return acc;
      }, {}),
      topTribunais: byTribunal
        .filter((t: any) => t.tribunal)
        .map((t: any) => ({ tribunal: t.tribunal, count: t._count as number })),
      topThemes: byTheme
        .filter((t: any) => t.theme)
        .map((t: any) => ({ theme: t.theme as string, count: t._count as number })),
      growth: { lastWeek: newThisWeek, lastMonth: newThisMonth },
      bySource: bySource.reduce((acc: Record<string, number>, s: any) => {
        acc[s.sourceType] = s._count;
        return acc;
      }, {}),
    };
  }
}

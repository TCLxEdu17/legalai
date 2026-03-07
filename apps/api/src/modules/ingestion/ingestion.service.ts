import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectorsFactory } from '../collectors/collectors.factory';
import { ChunkingService } from '../rag/chunking.service';
import { EmbeddingsService } from '../rag/embeddings.service';
import { RagService } from '../rag/rag.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AutoIngestionResult {
  jobId: string;
  itemsFound: number;
  itemsProcessed: number;
  itemsIndexed: number;
  itemsSkipped: number;
  errors: string[];
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly collectorsFactory: CollectorsFactory,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly ragService: RagService,
    private readonly configService: ConfigService,
  ) {
    this.embeddingModel = configService.get('app.ai.openai.embeddingModel', 'text-embedding-3-small');
  }

  /**
   * Executa ingestão automática para uma fonte específica.
   * Cria um IngestionJob, descobre itens novos, processa e indexa.
   */
  async runForSource(sourceId: string, trigger: 'MANUAL' | 'AUTOMATIC'): Promise<AutoIngestionResult> {
    const source = await this.prisma.externalSource.findUnique({ where: { id: sourceId } });
    if (!source) throw new NotFoundException(`Fonte ${sourceId} não encontrada`);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      this.logger.log(msg);
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    // Criar job de ingestão
    const job = await this.prisma.ingestionJob.create({
      data: {
        sourceType: 'AUTOMATIC',
        sourceId,
        triggerType: trigger,
        status: 'RUNNING',
        startedAt: new Date(),
        logsJson: [],
      },
    });

    addLog(`Job ${job.id} iniciado para fonte "${source.name}"`);

    let itemsFound = 0;
    let itemsProcessed = 0;
    let itemsIndexed = 0;
    let itemsSkipped = 0;
    const errors: string[] = [];

    try {
      // 1. Descobrir itens
      const collector = this.collectorsFactory.getCollector(source.sourceType);
      const discovered = await collector.discoverItems({
        baseUrl: source.baseUrl,
        configJson: source.configJson as Record<string, any>,
      });

      itemsFound = discovered.length;
      addLog(`${itemsFound} itens descobertos`);

      await this.prisma.ingestionJob.update({
        where: { id: job.id },
        data: { itemsFound },
      });

      // 2. Filtrar já indexados por URL/identifier
      const existingIdentifiers = await this.getExistingIdentifiers(
        discovered.map((d) => d.identifier),
      );

      const newItems = discovered.filter((d) => !existingIdentifiers.has(d.identifier));
      addLog(`${newItems.length} itens novos (${itemsFound - newItems.length} já indexados)`);
      itemsSkipped = itemsFound - newItems.length;

      // 3. Criar IngestionItems no DB
      if (newItems.length > 0) {
        await this.prisma.ingestionItem.createMany({
          data: newItems.map((item) => ({
            jobId: job.id,
            externalIdentifier: item.identifier,
            sourceUrl: item.url,
            title: item.title,
            status: 'PENDING',
          })),
        });
      }

      // 4. Processar cada item
      for (const item of newItems) {
        const dbItem = await this.prisma.ingestionItem.findFirst({
          where: { jobId: job.id, sourceUrl: item.url },
        });

        if (!dbItem) continue;

        try {
          await this.prisma.ingestionItem.update({
            where: { id: dbItem.id },
            data: { status: 'PROCESSING' },
          });

          addLog(`Processando: ${item.url}`);

          // Buscar conteúdo completo
          const collected = await collector.fetchItem(item.url, {
            baseUrl: source.baseUrl,
            configJson: source.configJson as Record<string, any>,
          });

          if (!collected.content || collected.content.trim().length < 100) {
            throw new Error('Conteúdo insuficiente (< 100 caracteres)');
          }

          // Verificar duplicidade por hash de conteúdo
          const contentHash = crypto
            .createHash('sha256')
            .update(collected.content)
            .digest('hex');

          const existingByHash = await this.prisma.jurisprudenceDocument.findFirst({
            where: { contentHash },
          });

          if (existingByHash) {
            addLog(`Hash duplicado ignorado: ${item.url}`);
            await this.prisma.ingestionItem.update({
              where: { id: dbItem.id },
              data: { status: 'SKIPPED' },
            });
            itemsSkipped++;
            continue;
          }

          // Extrair metadados via IA (opcional, melhor UX)
          let metadata = collected.metadata;
          try {
            const aiMeta = await this.ragService.extractMetadata(collected.content);
            metadata = {
              ...metadata,
              tribunal: aiMeta.tribunal || metadata.tribunal,
              processNumber: aiMeta.processNumber || metadata.processNumber,
              relator: aiMeta.relator || metadata.relator,
              judgmentDate: aiMeta.judgmentDate || metadata.judgmentDate,
              theme: aiMeta.theme || metadata.theme,
              keywords: aiMeta.keywords.length > 0 ? aiMeta.keywords : [],
            };
          } catch {
            // metadados manuais são suficientes
          }

          // Criar documento
          const systemUser = await this.getOrCreateSystemUser();
          const document = await this.prisma.jurisprudenceDocument.create({
            data: {
              title: collected.title,
              fileName: `auto_${Date.now()}.txt`,
              fileType: 'txt',
              filePath: '',
              fileSize: collected.content.length,
              originalText: collected.content,
              cleanedText: collected.content,
              tribunal: metadata.tribunal || null,
              processNumber: metadata.processNumber || null,
              relator: metadata.relator || null,
              judgmentDate: metadata.judgmentDate ? new Date(metadata.judgmentDate) : null,
              theme: metadata.theme || null,
              keywords: metadata.keywords || [],
              sourceType: 'AUTOMATIC',
              sourceId,
              sourceUrl: collected.sourceUrl,
              externalDocumentId: collected.externalIdentifier,
              contentHash,
              uploadStatus: 'PROCESSING',
              processingStatus: 'CHUNKING',
              createdById: systemUser.id,
            },
          });

          // Gerar chunks e embeddings
          const chunks = this.chunkingService.chunkText(collected.content);

          await this.prisma.jurisprudenceDocument.update({
            where: { id: document.id },
            data: { processingStatus: 'EMBEDDING' },
          });

          await this.embeddingsService.generateAndStoreEmbeddings(
            document.id,
            chunks,
            this.embeddingModel,
          );

          await this.prisma.jurisprudenceDocument.update({
            where: { id: document.id },
            data: {
              uploadStatus: 'COMPLETED',
              processingStatus: 'INDEXED',
              chunkCount: chunks.length,
            },
          });

          await this.prisma.ingestionItem.update({
            where: { id: dbItem.id },
            data: { status: 'INDEXED', documentId: document.id },
          });

          itemsProcessed++;
          itemsIndexed++;
          addLog(`Indexado: "${collected.title}" (${chunks.length} chunks)`);
        } catch (err) {
          errors.push(`${item.url}: ${err.message}`);
          addLog(`Erro em ${item.url}: ${err.message}`);

          await this.prisma.ingestionItem.update({
            where: { id: dbItem.id },
            data: { status: 'FAILED', errorMessage: err.message },
          });

          itemsProcessed++;
        }
      }

      // Finalizar job com sucesso
      const finalStatus = errors.length === 0 ? 'COMPLETED' : 'PARTIAL';
      await this.prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: finalStatus,
          finishedAt: new Date(),
          itemsFound,
          itemsProcessed,
          itemsIndexed,
          itemsSkipped,
          logsJson: logs as any,
        },
      });

      // Atualizar timestamps da fonte
      await this.prisma.externalSource.update({
        where: { id: sourceId },
        data: {
          lastRunAt: new Date(),
          ...(finalStatus === 'COMPLETED' && { lastSuccessAt: new Date() }),
        },
      });

      addLog(`Job ${job.id} concluído: ${itemsIndexed} indexados, ${errors.length} erros`);
    } catch (fatalErr) {
      this.logger.error(`Erro fatal no job ${job.id}: ${fatalErr.message}`);

      await this.prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: fatalErr.message,
          logsJson: logs as any,
        },
      });

      await this.prisma.externalSource.update({
        where: { id: sourceId },
        data: { lastRunAt: new Date() },
      });

      errors.push(fatalErr.message);
    }

    return {
      jobId: job.id,
      itemsFound,
      itemsProcessed,
      itemsIndexed,
      itemsSkipped,
      errors,
    };
  }

  async findAllJobs(page = 1, limit = 20, sourceId?: string) {
    const where: any = {};
    if (sourceId) where.sourceId = sourceId;

    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      this.prisma.ingestionJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          source: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.ingestionJob.count({ where }),
    ]);

    return {
      data: jobs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findJobById(id: string) {
    const job = await this.prisma.ingestionJob.findUnique({
      where: { id },
      include: {
        source: { select: { id: true, name: true } },
        items: { orderBy: { createdAt: 'desc' }, take: 100 },
      },
    });
    if (!job) throw new NotFoundException(`Job ${id} não encontrado`);
    return job;
  }

  private async getExistingIdentifiers(identifiers: string[]): Promise<Set<string>> {
    if (identifiers.length === 0) return new Set();

    const existing = await this.prisma.jurisprudenceDocument.findMany({
      where: {
        processingStatus: 'INDEXED', // Ignorar documentos presos em EMBEDDING/FAILED
        OR: [
          { externalDocumentId: { in: identifiers } },
          { sourceUrl: { in: identifiers } },
        ],
      },
      select: { externalDocumentId: true, sourceUrl: true },
    });

    const set = new Set<string>();
    existing.forEach((d: { externalDocumentId: string | null; sourceUrl: string | null }) => {
      if (d.externalDocumentId) set.add(d.externalDocumentId);
      if (d.sourceUrl) set.add(d.sourceUrl);
    });

    return set;
  }

  /**
   * Consolida o conhecimento por tema jurídico:
   * Para cada tema com >= 3 docs indexados, gera uma síntese AI e a reindexada na base vetorial.
   * Isso faz o RAG "aprender" — as sínteses temáticas ficam disponíveis para busca semântica.
   */
  async consolidateKnowledge(): Promise<{ themesProcessed: number; errors: string[] }> {
    this.logger.log('Iniciando consolidação de conhecimento por tema...');
    const errors: string[] = [];
    let themesProcessed = 0;

    // Temas com >= 3 docs indexados (exclui sínteses anteriores)
    const themes = await this.prisma.jurisprudenceDocument.groupBy({
      by: ['theme'],
      _count: true,
      where: {
        theme: { not: null },
        processingStatus: 'INDEXED',
        NOT: { keywords: { has: '__synthesis__' } },
      },
      having: { theme: { _count: { gte: 3 } } },
      orderBy: { _count: { theme: 'desc' } },
      take: 20,
    });

    for (const row of themes) {
      const theme = row.theme as string;

      try {
        // Verifica se já existe síntese recente (últimos 3 dias) para este tema
        const recentSynthesis = await this.prisma.jurisprudenceDocument.findFirst({
          where: {
            theme,
            keywords: { has: '__synthesis__' },
            createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          },
        });

        if (recentSynthesis) {
          this.logger.debug(`Síntese recente já existe para tema: "${theme}", pulando...`);
          continue;
        }

        // Coleta os 8 docs mais recentes do tema
        const docs = await this.prisma.jurisprudenceDocument.findMany({
          where: {
            theme,
            processingStatus: 'INDEXED',
            NOT: { keywords: { has: '__synthesis__' } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            title: true,
            tribunal: true,
            processNumber: true,
            judgmentDate: true,
            cleanedText: true,
            summary: true,
          },
        });

        if (docs.length < 3) continue;

        // Monta contexto para síntese
        const context = docs
          .map((d, i) => {
            const meta = [
              d.tribunal && `Tribunal: ${d.tribunal}`,
              d.processNumber && `Processo: ${d.processNumber}`,
              d.judgmentDate && `Data: ${new Date(d.judgmentDate).toLocaleDateString('pt-BR')}`,
            ]
              .filter(Boolean)
              .join(' | ');

            const text = (d.summary || d.cleanedText || '').slice(0, 1500);
            return `[DOC ${i + 1}] ${d.title}\n${meta}\n${text}`;
          })
          .join('\n\n---\n\n');

        // Gera síntese via IA
        const synthesisText = await this.ragService.summarizeTheme(theme, context);

        if (!synthesisText || synthesisText.trim().length < 200) continue;

        // Cria documento de síntese
        const systemUser = await this.getOrCreateSystemUser();
        const doc = await this.prisma.jurisprudenceDocument.create({
          data: {
            title: `Síntese Temática: ${theme}`,
            fileName: `synthesis_${Date.now()}.txt`,
            fileType: 'txt',
            filePath: '',
            fileSize: synthesisText.length,
            originalText: synthesisText,
            cleanedText: synthesisText,
            theme,
            keywords: ['__synthesis__', theme],
            sourceType: 'AUTOMATIC',
            uploadStatus: 'COMPLETED',
            processingStatus: 'CHUNKING',
            createdById: systemUser.id,
          },
        });

        // Gera embeddings da síntese
        const chunks = this.chunkingService.chunkText(synthesisText);
        await this.embeddingsService.generateAndStoreEmbeddings(doc.id, chunks, this.embeddingModel);

        await this.prisma.jurisprudenceDocument.update({
          where: { id: doc.id },
          data: { processingStatus: 'INDEXED', chunkCount: chunks.length },
        });

        themesProcessed++;
        this.logger.log(`Síntese criada para tema "${theme}" (${chunks.length} chunks)`);
      } catch (err) {
        errors.push(`Tema "${theme}": ${err.message}`);
        this.logger.error(`Erro ao consolidar tema "${theme}": ${err.message}`);
      }
    }

    this.logger.log(`Consolidação concluída: ${themesProcessed} temas processados`);
    return { themesProcessed, errors };
  }

  private async getOrCreateSystemUser() {
    let user = await this.prisma.user.findFirst({
      where: { email: 'system@legalai.internal' },
    });

    if (!user) {
      const argon2 = await import('argon2');
      user = await this.prisma.user.create({
        data: {
          name: 'Sistema (Ingestão Automática)',
          email: 'system@legalai.internal',
          passwordHash: await argon2.hash(crypto.randomBytes(32).toString('hex')),
          role: 'ADMIN',
          isActive: false,
        },
      });
    }

    return user;
  }
}

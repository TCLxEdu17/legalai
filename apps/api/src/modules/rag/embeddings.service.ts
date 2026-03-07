import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from './providers/ai-provider.interface';
import { TextChunk } from './chunking.service';

export interface StoredChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly BATCH_SIZE = 20; // Processar embeddings em lotes

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
  ) {}

  /**
   * Gera e armazena embeddings para todos os chunks de um documento.
   * Processa em lotes para não sobrecarregar a API.
   */
  async generateAndStoreEmbeddings(
    documentId: string,
    chunks: TextChunk[],
    embeddingModel: string,
  ): Promise<void> {
    this.logger.log(`Gerando embeddings para ${chunks.length} chunks do documento ${documentId}`);

    // Deletar embeddings anteriores do documento (para reprocessamento)
    await this.prisma.jurisprudenceChunk.deleteMany({ where: { documentId } });

    // Processar em lotes
    const batches = this.createBatches(chunks, this.BATCH_SIZE);
    let totalProcessed = 0;

    for (const [batchIndex, batch] of batches.entries()) {
      this.logger.debug(`Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} chunks)`);

      const texts = batch.map((c) => c.content);
      const embeddings = await this.aiProvider.generateEmbeddings(texts);

      // Salvar chunks com embeddings via SQL raw (pgvector não suporta via Prisma ORM diretamente)
      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];
        const embedding = embeddings[i].embedding;

        // Criar o chunk sem embedding primeiro
        const created = await this.prisma.jurisprudenceChunk.create({
          data: {
            documentId,
            chunkIndex: chunk.index,
            content: chunk.content,
            tokenCount: embeddings[i].tokenCount,
            embeddingModel,
            metadata: {
              startChar: chunk.startChar,
              endChar: chunk.endChar,
              tokenEstimate: chunk.tokenEstimate,
            },
          },
        });

        // Atualizar com o vetor via SQL raw (pgvector requer interpolação direta — não pode ser parâmetro)
        const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;
        await this.prisma.$executeRawUnsafe(
          `UPDATE jurisprudence_chunks SET embedding = ${embeddingLiteral} WHERE id = '${created.id}'::uuid`,
        );
      }

      totalProcessed += batch.length;
      this.logger.debug(`${totalProcessed}/${chunks.length} chunks processados`);

      // Pequena pausa entre lotes para respeitar rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    this.logger.log(`Embeddings gerados e armazenados: ${totalProcessed} chunks para documento ${documentId}`);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

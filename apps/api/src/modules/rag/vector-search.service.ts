import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from './providers/ai-provider.interface';

export interface RetrievedChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: any;
  document: {
    id: string;
    title: string;
    tribunal: string | null;
    processNumber: string | null;
    relator: string | null;
    judgmentDate: Date | null;
    theme: string | null;
    keywords: string[];
  };
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);
  private readonly topK: number;
  private readonly similarityThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
  ) {
    this.topK = configService.get<number>('app.rag.topK', 5);
    this.similarityThreshold = configService.get<number>(
      'app.rag.similarityThreshold',
      0.7,
    );
  }

  /**
   * Busca semântica: converte a pergunta em embedding e busca os chunks mais similares.
   */
  async search(
    query: string,
    options?: { topK?: number; threshold?: number; documentIds?: string[] },
  ): Promise<RetrievedChunk[]> {
    const topK = options?.topK ?? this.topK;
    const threshold = options?.threshold ?? this.similarityThreshold;

    this.logger.debug(`Buscando: "${query.slice(0, 80)}..." (top ${topK}, threshold: ${threshold})`);

    // Gerar embedding da query
    const { embedding } = await this.aiProvider.generateEmbedding(query);
    // Embedding gerado internamente — interpolação direta é segura
    const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;

    // Busca por similaridade de cosseno via pgvector
    const documentFilter = options?.documentIds?.length
      ? `AND jc.document_id = ANY(ARRAY[${options.documentIds.map((id) => `'${id}'::uuid`).join(',')}])`
      : '';

    const sql = `
      SELECT
        jc.id,
        jc.document_id,
        jc.chunk_index,
        jc.content,
        1 - (jc.embedding <=> ${embeddingLiteral}) AS similarity,
        jc.token_count,
        jc.metadata,
        jd.title AS doc_title,
        jd.tribunal AS doc_tribunal,
        jd.process_number AS doc_process_number,
        jd.relator AS doc_relator,
        jd.judgment_date AS doc_judgment_date,
        jd.theme AS doc_theme,
        jd.keywords AS doc_keywords
      FROM jurisprudence_chunks jc
      INNER JOIN jurisprudence_documents jd ON jd.id = jc.document_id
      WHERE
        jc.embedding IS NOT NULL
        AND jd.processing_status = 'INDEXED'
        AND (1 - (jc.embedding <=> ${embeddingLiteral})) >= ${threshold}
        ${documentFilter}
      ORDER BY jc.embedding <=> ${embeddingLiteral}
      LIMIT ${topK}
    `;

    const results = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        document_id: string;
        chunk_index: number;
        content: string;
        similarity: number;
        token_count: number;
        metadata: any;
        doc_title: string;
        doc_tribunal: string | null;
        doc_process_number: string | null;
        doc_relator: string | null;
        doc_judgment_date: Date | null;
        doc_theme: string | null;
        doc_keywords: string[];
      }>
    >(sql);

    const chunks: RetrievedChunk[] = results.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      chunkIndex: r.chunk_index,
      content: r.content,
      similarity: Number(r.similarity),
      metadata: r.metadata,
      document: {
        id: r.document_id,
        title: r.doc_title,
        tribunal: r.doc_tribunal,
        processNumber: r.doc_process_number,
        relator: r.doc_relator,
        judgmentDate: r.doc_judgment_date,
        theme: r.doc_theme,
        keywords: r.doc_keywords,
      },
    }));

    this.logger.debug(`Encontrados ${chunks.length} chunks relevantes`);

    return chunks;
  }
}

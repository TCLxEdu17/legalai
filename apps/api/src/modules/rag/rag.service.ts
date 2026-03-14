import { Injectable, Inject, Logger } from '@nestjs/common';
import { VectorSearchService, RetrievedChunk } from './vector-search.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from './providers/ai-provider.interface';
import {
  LEGAL_SYSTEM_PROMPT,
  LEGAL_FALLBACK_SYSTEM_PROMPT,
  buildRagUserPrompt,
  buildFallbackUserPrompt,
  buildSpecialtyInstruction,
  SUMMARIZATION_PROMPT,
  METADATA_EXTRACTION_PROMPT,
  DOCUMENT_ANALYSIS_SYSTEM_PROMPT,
  buildDocumentAnalysisUserPrompt,
} from './prompts/legal.prompts';

export interface RagQueryResult {
  answer: string;
  sources: SourceReference[];
  retrievedChunks: number;
  confidence: 'high' | 'medium' | 'low' | 'none';
  tokensUsed: { input: number; output: number };
  model: string;
}

export interface SourceReference {
  documentId: string;
  title: string;
  tribunal: string | null;
  processNumber: string | null;
  relator: string | null;
  judgmentDate: Date | null;
  theme: string | null;
  excerpts: Array<{
    content: string;
    similarity: number;
    chunkIndex: number;
  }>;
}

export interface ExtractedMetadata {
  tribunal: string | null;
  processNumber: string | null;
  relator: string | null;
  judgmentDate: string | null;
  theme: string | null;
  keywords: string[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly vectorSearchService: VectorSearchService,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
  ) {}

  /**
   * Pipeline RAG completo: busca semântica → montagem de contexto → geração de resposta.
   * Timeout global de 60s para evitar travamentos indefinidos.
   */
  async query(
    question: string,
    sessionHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    legalArea?: string,
  ): Promise<RagQueryResult> {
    const RAG_TIMEOUT_MS = 60_000;

    return Promise.race([
      this._queryInternal(question, sessionHistory, legalArea),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`[RAG] Timeout após ${RAG_TIMEOUT_MS / 1000}s`)),
          RAG_TIMEOUT_MS,
        ),
      ),
    ]);
  }

  private async _queryInternal(
    question: string,
    sessionHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    legalArea?: string,
  ): Promise<RagQueryResult> {
    const start = Date.now();
    this.logger.log(`[RAG] Query: "${question.slice(0, 100)}"`);

    // 1. Busca semântica
    const searchStart = Date.now();
    const retrievedChunks = await this.vectorSearchService.search(question);
    this.logger.debug(`[RAG] Busca vetorial: ${Date.now() - searchStart}ms | ${retrievedChunks.length} chunks`);

    // 2. Calcular nível de confiança baseado na similaridade
    const confidence = this.calculateConfidence(retrievedChunks);
    const hasContext = retrievedChunks.length > 0;

    if (hasContext) {
      const avgSim = (retrievedChunks.reduce((s, c) => s + c.similarity, 0) / retrievedChunks.length * 100).toFixed(1);
      const synthCount = retrievedChunks.filter((c) => c.document.keywords?.includes('__synthesis__')).length;
      this.logger.log(`[RAG] Modo RAG | chunks=${retrievedChunks.length} | sínteses=${synthCount} | sim_média=${avgSim}% | confiança=${confidence}`);
    } else {
      this.logger.log('[RAG] Modo fallback — base sem contexto, usando conhecimento completo do LLM');
    }

    // 3. Construir mensagens para o LLM
    const messages = this.buildMessages(question, retrievedChunks, sessionHistory, legalArea);

    // 4. Gerar resposta — sem contexto usa temperatura maior para explorar conhecimento amplo
    const llmStart = Date.now();
    const completion = await this.aiProvider.generateChatCompletion(messages, {
      temperature: hasContext ? 0.15 : 0.3,
      maxTokens: 4500,
    });
    this.logger.debug(
      `[RAG] LLM: ${Date.now() - llmStart}ms | modelo=${completion.model} | tokens=in:${completion.inputTokens} out:${completion.outputTokens}`,
    );

    // 5. Agrupar fontes por documento
    const sources = this.aggregateSources(retrievedChunks);

    this.logger.log(`[RAG] Total: ${Date.now() - start}ms | fontes=${sources.length}`);

    return {
      answer: completion.content,
      sources,
      retrievedChunks: retrievedChunks.length,
      confidence,
      tokensUsed: {
        input: completion.inputTokens,
        output: completion.outputTokens,
      },
      model: completion.model,
    };
  }

  /**
   * Gera síntese consolidada de um tema jurídico a partir de múltiplos documentos.
   * Usada pelo job de consolidação diária para enriquecer a base de conhecimento.
   */
  async summarizeTheme(theme: string, context: string): Promise<string> {
    const completion = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um especialista em direito brasileiro com profundo conhecimento jurisprudencial.
Sua tarefa é elaborar uma SÍNTESE TEMÁTICA consolidada sobre o tema "${theme}".

A síntese deve:
1. Apresentar a tese jurídica dominante sobre o tema
2. Identificar convergências e divergências entre os julgados
3. Citar as principais posições dos tribunais superiores
4. Destacar a evolução jurisprudencial recente
5. Indicar os fundamentos legais e constitucionais centrais
6. Apontar pontos controvertidos e tendências

Use linguagem técnica e seja completo. Mínimo de 400 palavras.`,
        },
        {
          role: 'user',
          content: `Tema: ${theme}\n\nDocumentos para síntese:\n\n${context.slice(0, 12000)}`,
        },
      ],
      { temperature: 0.3, maxTokens: 2000 },
    );
    return completion.content;
  }

  /**
   * Resume uma jurisprudência completa.
   */
  async summarizeDocument(text: string): Promise<string> {
    const completion = await this.aiProvider.generateChatCompletion(
      [
        { role: 'system', content: SUMMARIZATION_PROMPT },
        { role: 'user', content: text.slice(0, 12000) }, // Limitar para não exceder contexto
      ],
      { temperature: 0.3, maxTokens: 1000 },
    );
    return completion.content;
  }

  /**
   * Extrai metadados de um documento jurídico usando IA.
   */
  async extractMetadata(text: string): Promise<ExtractedMetadata> {
    try {
      const completion = await this.aiProvider.generateChatCompletion(
        [
          { role: 'system', content: METADATA_EXTRACTION_PROMPT },
          { role: 'user', content: text.slice(0, 8000) },
        ],
        { temperature: 0.1, maxTokens: 500 },
      );

      const cleaned = completion.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      return JSON.parse(cleaned) as ExtractedMetadata;
    } catch (err) {
      this.logger.warn('Falha ao extrair metadados via IA, retornando vazio');
      return {
        tribunal: null,
        processNumber: null,
        relator: null,
        judgmentDate: null,
        theme: null,
        keywords: [],
      };
    }
  }

  private buildMessages(
    question: string,
    chunks: RetrievedChunk[],
    history?: Array<{ role: 'user' | 'assistant'; content: string }>,
    legalArea?: string,
  ) {
    const hasContext = chunks.length > 0;
    const specialtyInstruction = buildSpecialtyInstruction(legalArea);
    const basePrompt = hasContext ? LEGAL_SYSTEM_PROMPT : LEGAL_FALLBACK_SYSTEM_PROMPT;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: basePrompt + specialtyInstruction },
    ];

    // Incluir histórico recente da sessão (últimas 6 mensagens)
    if (history && history.length > 0) {
      messages.push(...history.slice(-6));
    }

    // Mensagem com contexto RAG ou fallback para conhecimento geral
    messages.push({
      role: 'user',
      content: hasContext ? buildRagUserPrompt(question, chunks) : buildFallbackUserPrompt(question),
    });

    return messages;
  }

  private calculateConfidence(chunks: RetrievedChunk[]): 'high' | 'medium' | 'low' | 'none' {
    if (chunks.length === 0) return 'none';

    const avgSimilarity =
      chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;

    if (avgSimilarity >= 0.88 && chunks.length >= 3) return 'high';
    if (avgSimilarity >= 0.78 && chunks.length >= 2) return 'medium';
    return 'low';
  }

  async analyzeDocument(text: string): Promise<{
    tipoDocumento: string;
    partes: string[];
    resumo: string;
    pontosChave: Array<{ ponto: string; localizacao: string }>;
    datas: Array<{ data: string; descricao: string; localizacao: string }>;
    pontosAtencao: Array<{ ponto: string; localizacao: string; risco: string }>;
    perguntas: string[];
  }> {
    const completion = await this.aiProvider.generateChatCompletion(
      [
        { role: 'system', content: DOCUMENT_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: buildDocumentAnalysisUserPrompt(text) },
      ],
      { temperature: 0.1, maxTokens: 3000 },
    );

    const cleaned = completion.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      this.logger.warn('Falha ao parsear análise de documento, retornando estrutura vazia');
      return {
        tipoDocumento: '',
        partes: [],
        resumo: cleaned.slice(0, 500),
        pontosChave: [],
        datas: [],
        pontosAtencao: [],
        perguntas: [],
      };
    }
  }

  private aggregateSources(chunks: RetrievedChunk[]): SourceReference[] {
    const docMap = new Map<string, SourceReference>();

    for (const chunk of chunks) {
      const docId = chunk.documentId;

      if (!docMap.has(docId)) {
        docMap.set(docId, {
          documentId: docId,
          title: chunk.document.title,
          tribunal: chunk.document.tribunal,
          processNumber: chunk.document.processNumber,
          relator: chunk.document.relator,
          judgmentDate: chunk.document.judgmentDate,
          theme: chunk.document.theme,
          excerpts: [],
        });
      }

      docMap.get(docId)!.excerpts.push({
        content: chunk.content.slice(0, 400), // Exibir apenas preview
        similarity: chunk.similarity,
        chunkIndex: chunk.chunkIndex,
      });
    }

    // Ordenar fontes por similaridade máxima do documento
    return Array.from(docMap.values()).sort((a, b) => {
      const maxA = Math.max(...a.excerpts.map((e) => e.similarity));
      const maxB = Math.max(...b.excerpts.map((e) => e.similarity));
      return maxB - maxA;
    });
  }
}

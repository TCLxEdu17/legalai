import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkingService, TextChunk } from '../rag/chunking.service';
import { AI_PROVIDER_TOKEN, IAIProvider } from '../rag/providers/ai-provider.interface';
import { PdfProcessor } from '../uploads/processors/pdf.processor';
import { DocxProcessor } from '../uploads/processors/docx.processor';
import { TextProcessor } from '../uploads/processors/text.processor';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { ChatCaseDto } from './dto/chat-case.dto';
import { GeneratePieceDto } from './dto/generate-piece.dto';
import { GenerateHearingDto } from './dto/generate-hearing.dto';
import { PredictCompensationDto } from './dto/predict-compensation.dto';
import {
  CaseStatus,
  CaseDocType,
  MessageRole,
  UploadStatus,
  ProcessingStatus,
  PieceType,
} from '@prisma/client';

const PIECE_PROMPTS: Record<PieceType, string> = {
  CONTESTACAO: `Você é um advogado experiente redigindo uma CONTESTAÇÃO.
Com base nos autos abaixo, redija uma contestação completa com:
1. Preliminares (se cabíveis): ilegitimidade, inépcia, prescrição, etc.
2. Mérito: negue os fatos que não forem verídicos, apresente os fatos verdadeiros.
3. Fundamentos jurídicos: cite artigos de lei e jurisprudência aplicáveis.
4. Pedidos: rejeição de todos os pedidos do autor.
Use linguagem jurídica formal, estruture com numeração e subtítulos.`,

  PETICAO_INICIAL: `Você é um advogado experiente redigindo uma PETIÇÃO INICIAL.
Com base nos dados do caso abaixo, redija uma petição inicial completa com:
1. Endereçamento ao juízo competente.
2. Qualificação das partes.
3. Dos fatos (narrativa clara e objetiva).
4. Do direito (fundamentos legais e jurisprudenciais).
5. Do pedido (pedidos principais e subsidiários, com valor da causa).
Use linguagem jurídica formal.`,

  RECURSO: `Você é um advogado experiente redigindo um RECURSO.
Com base nos autos e na decisão recorrida abaixo, redija um recurso completo com:
1. Cabimento e tempestividade.
2. Síntese da decisão recorrida.
3. Razões do recurso: aponte os erros de fato e/ou de direito.
4. Jurisprudência favorável.
5. Pedido de reforma ou anulação.`,

  APELACAO: `Você é um advogado experiente redigindo uma APELAÇÃO.
Com base na sentença e nos autos abaixo, redija uma apelação completa com:
1. Cabimento, tempestividade e preparo.
2. Breve relatório dos fatos e da sentença.
3. Razões de apelação por tópicos: erro de fato, erro de direito, cerceamento de defesa.
4. Jurisprudência do tribunal favorável.
5. Pedido de provimento total ou parcial.`,

  AGRAVO: `Você é um advogado experiente redigindo um AGRAVO.
Com base na decisão interlocutória e nos autos abaixo, redija o agravo com:
1. Identificação da decisão agravada.
2. Fundamentação: por que a decisão merece reforma.
3. Urgência (se aplicável para agravo regimental/interno).
4. Pedido de reconsideração ou provimento.`,

  EMBARGOS: `Você é um advogado experiente redigindo EMBARGOS DE DECLARAÇÃO.
Com base na decisão embargada abaixo, redija os embargos apontando:
1. Os pontos omissos, contraditórios ou obscuros.
2. A relevância de cada ponto para o resultado do julgamento.
3. O pedido de integração ou esclarecimento da decisão.`,

  REPLICA: `Você é um advogado experiente redigindo uma RÉPLICA.
Com base na contestação apresentada pelo réu e nos autos abaixo, redija a réplica:
1. Rebata os argumentos da contestação ponto por ponto.
2. Reafirme os fatos da petição inicial.
3. Reforce os fundamentos jurídicos.
4. Reitere os pedidos da inicial.`,

  ALEGACOES_FINAIS: `Você é um advogado experiente redigindo ALEGAÇÕES FINAIS.
Com base em toda a instrução processual abaixo, redija as alegações finais:
1. Síntese dos fatos provados em audiência.
2. Análise das provas produzidas (documentos, testemunhos, laudos).
3. Fundamentos jurídicos aplicáveis ao caso provado.
4. Conclusão e pedido de procedência.`,

  OUTROS: `Você é um advogado experiente.
Com base nos autos e nas instruções específicas abaixo, redija a peça jurídica solicitada.
Use linguagem jurídica formal e estrutura adequada ao tipo de documento.`,
};

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);
  private readonly BATCH_SIZE = 20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunkingService: ChunkingService,
    private readonly pdfProcessor: PdfProcessor,
    private readonly docxProcessor: DocxProcessor,
    private readonly textProcessor: TextProcessor,
    @Inject(AI_PROVIDER_TOKEN) private readonly aiProvider: IAIProvider,
  ) {}

  // ─── CASOS CRUD ───────────────────────────────────────────────────────────

  async createCase(dto: CreateCaseDto, userId: string) {
    return this.prisma.case.create({
      data: {
        userId,
        title: dto.title,
        area: dto.area,
        processNumber: dto.processNumber,
        court: dto.court,
        judge: dto.judge,
        plaintiff: dto.plaintiff,
        defendant: dto.defendant,
        caseValue: dto.caseValue,
        notes: dto.notes,
      },
    });
  }

  async listCases(userId: string) {
    return this.prisma.case.findMany({
      where: { userId, status: { not: CaseStatus.ARCHIVED } },
      select: {
        id: true,
        title: true,
        area: true,
        status: true,
        processNumber: true,
        court: true,
        plaintiff: true,
        defendant: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { documents: true, messages: true, pieces: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getCase(caseId: string, userId: string) {
    const c = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: {
          select: {
            id: true,
            title: true,
            docType: true,
            fileName: true,
            fileSize: true,
            uploadStatus: true,
            processingStatus: true,
            chunkCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        pieces: {
          select: {
            id: true,
            title: true,
            pieceType: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { messages: true } },
      },
    });

    if (!c) throw new NotFoundException('Caso não encontrado');
    if (c.userId !== userId) throw new ForbiddenException('Acesso negado');

    return c;
  }

  async updateCase(caseId: string, dto: UpdateCaseDto, userId: string) {
    await this.assertOwnership(caseId, userId);
    return this.prisma.case.update({
      where: { id: caseId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.area !== undefined && { area: dto.area }),
        ...(dto.status && { status: dto.status }),
        ...(dto.processNumber !== undefined && { processNumber: dto.processNumber }),
        ...(dto.court !== undefined && { court: dto.court }),
        ...(dto.judge !== undefined && { judge: dto.judge }),
        ...(dto.plaintiff !== undefined && { plaintiff: dto.plaintiff }),
        ...(dto.defendant !== undefined && { defendant: dto.defendant }),
        ...(dto.caseValue !== undefined && { caseValue: dto.caseValue }),
        ...(dto.strategy !== undefined && { strategy: dto.strategy }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async deleteCase(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);
    await this.prisma.case.delete({ where: { id: caseId } });
  }

  // ─── DOCUMENTOS DO CASO ───────────────────────────────────────────────────

  async uploadDocument(
    caseId: string,
    userId: string,
    file: Express.Multer.File,
    docType?: CaseDocType,
    title?: string,
  ) {
    await this.assertOwnership(caseId, userId);

    const docRecord = await this.prisma.caseDocument.create({
      data: {
        caseId,
        title: title || file.originalname,
        docType: docType ?? CaseDocType.OUTROS,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadStatus: UploadStatus.PROCESSING,
        processingStatus: ProcessingStatus.NOT_STARTED,
      },
    });

    // Processar em background — não bloqueia o response
    this.processDocumentAsync(docRecord.id, file.buffer, file.mimetype).catch((err) => {
      this.logger.error(`Falha ao processar documento ${docRecord.id}: ${err?.message}`);
    });

    return { id: docRecord.id, status: 'processing', message: 'Documento recebido e em processamento.' };
  }

  private async processDocumentAsync(docId: string, buffer: Buffer, mimeType: string) {
    try {
      // 1. Extrai texto
      await this.prisma.caseDocument.update({
        where: { id: docId },
        data: { processingStatus: ProcessingStatus.CHUNKING },
      });

      const text = await this.extractText(buffer, mimeType);
      if (!text || text.trim().length < 50) {
        throw new Error('Documento sem conteúdo textual suficiente para processar.');
      }

      await this.prisma.caseDocument.update({
        where: { id: docId },
        data: { originalText: text },
      });

      // 2. Chunking
      const chunks = this.chunkingService.chunkText(text);

      // 3. Embeddings
      await this.prisma.caseDocument.update({
        where: { id: docId },
        data: { processingStatus: ProcessingStatus.EMBEDDING },
      });

      await this.prisma.caseChunk.deleteMany({ where: { documentId: docId } });

      const batches = this.createBatches<TextChunk>(chunks, this.BATCH_SIZE);
      for (const [batchIdx, batch] of batches.entries()) {
        const embeddings = await this.aiProvider.generateEmbeddings(batch.map((c) => c.content));

        for (let i = 0; i < batch.length; i++) {
          const chunk = batch[i] as TextChunk;
          const embedding = embeddings[i].embedding;

          const created = await this.prisma.caseChunk.create({
            data: {
              documentId: docId,
              chunkIndex: chunk.index,
              content: chunk.content,
              tokenCount: embeddings[i].tokenCount,
              metadata: { startChar: chunk.startChar, endChar: chunk.endChar },
            },
          });

          const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;
          await this.prisma.$executeRawUnsafe(
            `UPDATE case_chunks SET embedding = ${embeddingLiteral} WHERE id = '${created.id}'::uuid`,
          );
        }

        if (batchIdx < batches.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // 4. Marca como indexado
      await this.prisma.caseDocument.update({
        where: { id: docId },
        data: {
          uploadStatus: UploadStatus.COMPLETED,
          processingStatus: ProcessingStatus.INDEXED,
          chunkCount: chunks.length,
        },
      });

      this.logger.log(`Documento de caso ${docId} indexado com ${chunks.length} chunks.`);
    } catch (err: any) {
      this.logger.error(`Erro ao processar documento ${docId}: ${err?.message}`);
      await this.prisma.caseDocument.update({
        where: { id: docId },
        data: {
          uploadStatus: UploadStatus.FAILED,
          processingStatus: ProcessingStatus.FAILED,
          processingError: err?.message ?? 'Erro desconhecido',
        },
      });
    }
  }

  async deleteDocument(caseId: string, docId: string, userId: string) {
    await this.assertOwnership(caseId, userId);
    const doc = await this.prisma.caseDocument.findFirst({ where: { id: docId, caseId } });
    if (!doc) throw new NotFoundException('Documento não encontrado neste caso');
    await this.prisma.caseDocument.delete({ where: { id: docId } });
  }

  // ─── CHAT COM OS AUTOS ────────────────────────────────────────────────────

  async chat(caseId: string, dto: ChatCaseDto, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { title: true, area: true, plaintiff: true, defendant: true, court: true, strategy: true },
    });

    // Salva mensagem do usuário
    await this.prisma.caseMessage.create({
      data: { caseId, role: MessageRole.USER, content: dto.message },
    });

    // Histórico recente
    const history = await this.getRecentHistory(caseId);

    // Busca semântica nos chunks do caso
    const { embedding } = await this.aiProvider.generateEmbedding(dto.message);
    const embeddingLiteral = `'[${embedding.join(',')}]'::vector`;

    const chunks = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        document_id: string;
        chunk_index: number;
        content: string;
        similarity: number;
        doc_title: string;
        doc_type: string;
      }>
    >(`
      SELECT
        cc.id,
        cc.document_id,
        cc.chunk_index,
        cc.content,
        1 - (cc.embedding <=> ${embeddingLiteral}) AS similarity,
        cd.title AS doc_title,
        cd.doc_type AS doc_type
      FROM case_chunks cc
      INNER JOIN case_documents cd ON cd.id = cc.document_id
      WHERE
        cc.embedding IS NOT NULL
        AND cd.case_id = '${caseId}'::uuid
        AND cd.processing_status = 'INDEXED'
        AND (1 - (cc.embedding <=> ${embeddingLiteral})) >= 0.65
      ORDER BY cc.embedding <=> ${embeddingLiteral}
      LIMIT 8
    `);

    const hasContext = chunks.length > 0;

    const contextText = hasContext
      ? chunks
          .map(
            (c) =>
              `[Documento: ${c.doc_title} | Tipo: ${c.doc_type} | Chunk #${c.chunk_index + 1}]\n${c.content}`,
          )
          .join('\n\n---\n\n')
      : '';

    const systemPrompt = `Você é um assistente jurídico especializado, analisando o caso: "${caseData?.title}".
Área: ${caseData?.area ?? 'Não especificada'}.
Partes: ${caseData?.plaintiff ?? '?'} (autor) vs ${caseData?.defendant ?? '?'} (réu).
Tribunal: ${caseData?.court ?? 'Não especificado'}.
${caseData?.strategy ? `Estratégia definida: ${caseData.strategy}` : ''}

REGRAS CRÍTICAS:
1. Responda APENAS com base nos documentos dos autos fornecidos abaixo.
2. Se a informação não estiver nos autos, diga explicitamente: "Não encontrei esta informação nos documentos carregados."
3. Sempre cite o documento e o número do chunk de onde a informação foi extraída.
4. Nunca invente fatos, datas, nomes ou valores que não estejam nos documentos.
5. Use linguagem jurídica precisa mas acessível.
${hasContext ? `\n--- TRECHOS DOS AUTOS ---\n${contextText}` : '\n[Nenhum documento indexado encontrado para este caso. Solicite ao usuário que faça upload dos autos.]'}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history,
      { role: 'user' as const, content: dto.message },
    ];

    const result = await this.aiProvider.generateChatCompletion(messages, {
      temperature: hasContext ? 0.1 : 0.3,
      maxTokens: 2000,
    });

    const sources = chunks.map((c) => ({
      documentId: c.document_id,
      documentTitle: c.doc_title,
      documentType: c.doc_type,
      chunkIndex: c.chunk_index,
      similarity: Number(c.similarity).toFixed(3),
      excerpt: c.content.slice(0, 200) + (c.content.length > 200 ? '...' : ''),
    }));

    const assistantMsg = await this.prisma.caseMessage.create({
      data: {
        caseId,
        role: MessageRole.ASSISTANT,
        content: result.content,
        sources: sources as any,
        metadata: {
          retrievedChunks: chunks.length,
          tokensUsed: { input: result.inputTokens, output: result.outputTokens },
          model: result.model,
          hasContext,
        } as any,
      },
    });

    return {
      message: {
        id: assistantMsg.id,
        content: result.content,
        sources,
        retrievedChunks: chunks.length,
        createdAt: assistantMsg.createdAt,
      },
    };
  }

  async getChatHistory(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);
    return this.prisma.caseMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, sources: true, metadata: true, createdAt: true },
    });
  }

  async clearChatHistory(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);
    await this.prisma.caseMessage.deleteMany({ where: { caseId } });
  }

  // ─── GERADOR DE PEÇAS ─────────────────────────────────────────────────────

  async generatePiece(caseId: string, dto: GeneratePieceDto, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        title: true,
        area: true,
        plaintiff: true,
        defendant: true,
        court: true,
        judge: true,
        processNumber: true,
        caseValue: true,
        strategy: true,
        notes: true,
      },
    });

    // Recupera todos os chunks indexados do caso para contexto da peça
    const allChunks = await this.prisma.$queryRawUnsafe<
      Array<{ content: string; doc_title: string; doc_type: string; chunk_index: number }>
    >(`
      SELECT
        cc.content,
        cd.title AS doc_title,
        cd.doc_type AS doc_type,
        cc.chunk_index
      FROM case_chunks cc
      INNER JOIN case_documents cd ON cd.id = cc.document_id
      WHERE cd.case_id = '${caseId}'::uuid
        AND cd.processing_status = 'INDEXED'
      ORDER BY cd.created_at ASC, cc.chunk_index ASC
      LIMIT 60
    `);

    if (allChunks.length === 0) {
      throw new BadRequestException(
        'Nenhum documento indexado neste caso. Faça upload dos autos antes de gerar peças.',
      );
    }

    const contextText = allChunks
      .map((c) => `[${c.doc_title} — ${c.doc_type} — Chunk #${c.chunk_index + 1}]\n${c.content}`)
      .join('\n\n---\n\n');

    const caseInfo = `
DADOS DO CASO:
- Título: ${caseData?.title}
- Área: ${caseData?.area ?? 'Não especificada'}
- Processo: ${caseData?.processNumber ?? 'Não informado'}
- Tribunal/Vara: ${caseData?.court ?? 'Não informado'}
- Juiz: ${caseData?.judge ?? 'Não informado'}
- Autor/Requerente: ${caseData?.plaintiff ?? 'Não informado'}
- Réu/Requerido: ${caseData?.defendant ?? 'Não informado'}
- Valor da causa: ${caseData?.caseValue ? `R$ ${Number(caseData.caseValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Não informado'}
${caseData?.strategy ? `- Estratégia definida pelo advogado: ${caseData.strategy}` : ''}
${caseData?.notes ? `- Notas do advogado: ${caseData.notes}` : ''}
${dto.instructions ? `- Instruções específicas para esta peça: ${dto.instructions}` : ''}`;

    const piecePrompt = PIECE_PROMPTS[dto.pieceType];

    const STYLE_INSTRUCTIONS: Record<string, string> = {
      formal_classico: 'Use linguagem jurídica clássica e formal, com vocábulos técnicos tradicionais do direito brasileiro.',
      moderno: 'Use linguagem jurídica moderna e direta, clara para leitores não especializados sem perder a precisão técnica.',
      agressivo: 'Adote tom firme e incisivo, destacando fortemente os pontos favoráveis e rebatendo energicamente os contrários.',
      tecnico: 'Priorize a argumentação técnica e doutrinária, com amplas citações de artigos de lei, doutrina e jurisprudência.',
      custom: dto.customStyle ? `Siga este estilo específico: ${dto.customStyle}` : '',
    };
    const styleNote = dto.style ? `\nESTILO DE REDAÇÃO: ${STYLE_INSTRUCTIONS[dto.style] ?? ''}` : '';

    const systemPrompt = `${piecePrompt}${styleNote}

REGRAS:
1. Use APENAS os fatos presentes nos autos abaixo. Não invente fatos.
2. Se alguma informação necessária não estiver nos autos, indique com [COMPLETAR: descrição do que falta].
3. Use linguagem jurídica formal adequada ao direito brasileiro.
4. Cite os fundamentos legais (artigos de lei) e mencione jurisprudência quando pertinente — mas apenas se você tiver certeza da existência do julgado.
5. Estruture a peça com numeração, títulos e subtítulos claros.
6. Ao final, adicione uma seção "⚠️ PONTOS PARA REVISÃO DO ADVOGADO" listando o que precisa ser verificado/completado.

${caseInfo}

--- AUTOS DO PROCESSO ---
${contextText}`;

    const result = await this.aiProvider.generateChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Redija agora a peça: ${dto.title}` },
      ],
      { temperature: 0.15, maxTokens: 4000 },
    );

    const piece = await this.prisma.casePiece.create({
      data: {
        caseId,
        title: dto.title,
        pieceType: dto.pieceType,
        content: result.content,
        prompt: dto.instructions,
      },
    });

    return piece;
  }

  async getPiece(caseId: string, pieceId: string, userId: string) {
    await this.assertOwnership(caseId, userId);
    const piece = await this.prisma.casePiece.findFirst({ where: { id: pieceId, caseId } });
    if (!piece) throw new NotFoundException('Peça não encontrada');
    return piece;
  }

  async deletePiece(caseId: string, pieceId: string, userId: string) {
    await this.assertOwnership(caseId, userId);
    const piece = await this.prisma.casePiece.findFirst({ where: { id: pieceId, caseId } });
    if (!piece) throw new NotFoundException('Peça não encontrada');
    await this.prisma.casePiece.delete({ where: { id: pieceId } });
  }

  // ─── RESUMO DO CASO ───────────────────────────────────────────────────────

  async getCaseSummary(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        title: true,
        area: true,
        plaintiff: true,
        defendant: true,
        court: true,
        processNumber: true,
        caseValue: true,
        strategy: true,
        notes: true,
        createdAt: true,
        _count: { select: { documents: true, messages: true, pieces: true } },
      },
    });

    const indexedDocs = await this.prisma.caseDocument.count({
      where: { caseId, processingStatus: ProcessingStatus.INDEXED },
    });

    // Pega os primeiros chunks para gerar resumo
    const sampleChunks = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT cc.content FROM case_chunks cc
       INNER JOIN case_documents cd ON cd.id = cc.document_id
       WHERE cd.case_id = '${caseId}'::uuid AND cd.processing_status = 'INDEXED'
       ORDER BY cd.created_at ASC, cc.chunk_index ASC
       LIMIT 15`,
    );

    let aiSummary: string | null = null;
    if (sampleChunks.length > 0) {
      const context = sampleChunks.map((c) => c.content).join('\n\n---\n\n');
      const result = await this.aiProvider.generateChatCompletion(
        [
          {
            role: 'system',
            content:
              'Você é um assistente jurídico. Com base nos trechos dos autos fornecidos, gere um resumo executivo estruturado do caso: (1) Natureza da ação, (2) Partes, (3) Pedidos principais, (4) Estado atual do processo, (5) Pontos críticos identificados. Seja objetivo e use linguagem jurídica clara. Máximo 400 palavras.',
          },
          { role: 'user', content: `Autos:\n${context}` },
        ],
        { temperature: 0.2, maxTokens: 600 },
      );
      aiSummary = result.content;
    }

    return {
      case: caseData,
      indexedDocuments: indexedDocs,
      aiSummary,
    };
  }

  // ─── NARRATIVA JURÍDICA ───────────────────────────────────────────────────

  async buildLegalNarrative(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { title: true, area: true, plaintiff: true, defendant: true, court: true, processNumber: true },
    });

    const chunks = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT cc.content FROM case_chunks cc
       INNER JOIN case_documents cd ON cd.id = cc.document_id
       WHERE cd.case_id = '${caseId}'::uuid AND cd.processing_status = 'INDEXED'
       ORDER BY cd.created_at ASC, cc.chunk_index ASC
       LIMIT 40`,
    );

    if (chunks.length === 0) {
      throw new BadRequestException('Nenhum documento indexado. Faça upload dos autos primeiro.');
    }

    const context = chunks.map((c) => c.content).join('\n\n---\n\n');

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um advogado experiente. Com base nos documentos dos autos, construa uma narrativa jurídica cronológica e estruturada do caso.
Retorne APENAS um JSON válido com esta estrutura:
{
  "narrativa": "texto completo da narrativa cronológica dos fatos",
  "enquadramentoJuridico": "artigos do CC/CDC/CLT/etc. aplicáveis com justificativa",
  "pontosChave": ["ponto 1", "ponto 2", ...],
  "recomendacaoEstrategica": "recomendação estratégica resumida"
}`,
        },
        {
          role: 'user',
          content: `Caso: ${caseData?.title}\nPartes: ${caseData?.plaintiff} vs ${caseData?.defendant}\nÁrea: ${caseData?.area}\n\nAutos:\n${context}`,
        },
      ],
      { temperature: 0.15, maxTokens: 2500 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return { narrativa: result.content, enquadramentoJuridico: '', pontosChave: [], recomendacaoEstrategica: '' };
    }
  }

  // ─── ANÁLISE DE PROVAS ────────────────────────────────────────────────────

  async analyzeEvidence(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { title: true, area: true, plaintiff: true, defendant: true },
    });

    const chunks = await this.prisma.$queryRawUnsafe<Array<{ content: string; doc_title: string; doc_type: string }>>(
      `SELECT cc.content, cd.title AS doc_title, cd.doc_type AS doc_type
       FROM case_chunks cc
       INNER JOIN case_documents cd ON cd.id = cc.document_id
       WHERE cd.case_id = '${caseId}'::uuid AND cd.processing_status = 'INDEXED'
       ORDER BY cd.created_at ASC, cc.chunk_index ASC
       LIMIT 40`,
    );

    if (chunks.length === 0) {
      throw new BadRequestException('Nenhum documento indexado. Faça upload dos autos primeiro.');
    }

    const context = chunks.map((c) => `[${c.doc_title} — ${c.doc_type}]\n${c.content}`).join('\n\n---\n\n');

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um especialista em direito processual. Analise os documentos dos autos e avalie o quadro probatório.
Retorne APENAS um JSON válido com esta estrutura:
{
  "provasNecessarias": ["prova 1", "prova 2", ...],
  "provasPresentes": [{"descricao": "...", "documento": "...", "forca": "forte|media|fraca"}],
  "provasFaltando": [{"descricao": "...", "urgencia": "alta|media|baixa", "sugestao": "..."}],
  "alertas": ["alerta 1", "alerta 2", ...],
  "avaliacaoGeral": "forte|adequada|fraca|critica"
}`,
        },
        {
          role: 'user',
          content: `Caso: ${caseData?.title}\nPartes: ${caseData?.plaintiff} vs ${caseData?.defendant}\nÁrea: ${caseData?.area}\n\nDocumentos:\n${context}`,
        },
      ],
      { temperature: 0.1, maxTokens: 2000 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return { provasNecessarias: [], provasPresentes: [], provasFaltando: [], alertas: [result.content], avaliacaoGeral: 'fraca' };
    }
  }

  // ─── DETECÇÃO DE TESES ────────────────────────────────────────────────────

  async detectLegalTheses(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { title: true, area: true, plaintiff: true, defendant: true, strategy: true },
    });

    const chunks = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT cc.content FROM case_chunks cc
       INNER JOIN case_documents cd ON cd.id = cc.document_id
       WHERE cd.case_id = '${caseId}'::uuid AND cd.processing_status = 'INDEXED'
       ORDER BY cd.created_at ASC, cc.chunk_index ASC
       LIMIT 35`,
    );

    if (chunks.length === 0) {
      throw new BadRequestException('Nenhum documento indexado. Faça upload dos autos primeiro.');
    }

    const context = chunks.map((c) => c.content).join('\n\n---\n\n');

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um advogado sênior especialista em teses jurídicas. Identifique as teses aplicáveis ao caso.
Retorne APENAS um JSON válido com esta estrutura:
{
  "teses": [
    {
      "nome": "nome da tese",
      "descricao": "descrição detalhada e como se aplica ao caso",
      "leis": ["Art. X da Lei Y", "Súmula Z do STJ", ...],
      "confianca": 0.0 a 1.0,
      "favorabilidade": "autor|reu|neutra"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Caso: ${caseData?.title}\nÁrea: ${caseData?.area}\nPartes: ${caseData?.plaintiff} vs ${caseData?.defendant}\n${caseData?.strategy ? `Estratégia: ${caseData.strategy}` : ''}\n\nAutos:\n${context}`,
        },
      ],
      { temperature: 0.15, maxTokens: 2500 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return { teses: [] };
    }
  }

  // ─── GERADOR DE PERGUNTAS PARA AUDIÊNCIA ──────────────────────────────────

  async generateHearingQuestions(caseId: string, dto: GenerateHearingDto, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { title: true, area: true, plaintiff: true, defendant: true, strategy: true },
    });

    const chunks = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT cc.content FROM case_chunks cc
       INNER JOIN case_documents cd ON cd.id = cc.document_id
       WHERE cd.case_id = '${caseId}'::uuid AND cd.processing_status = 'INDEXED'
       ORDER BY cd.created_at ASC, cc.chunk_index ASC
       LIMIT 30`,
    );

    if (chunks.length === 0) {
      throw new BadRequestException('Nenhum documento indexado. Faça upload dos autos primeiro.');
    }

    const context = chunks.map((c) => c.content).join('\n\n---\n\n');
    const witnessInfo = dto.witnessName
      ? `Testemunha: ${dto.witnessName}${dto.witnessRole ? ` (${dto.witnessRole})` : ''}`
      : 'Testemunha não identificada';

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um advogado experiente se preparando para audiência. Gere perguntas estratégicas para a oitiva.
Retorne APENAS um JSON válido com esta estrutura:
{
  "perguntas": [
    {"pergunta": "texto da pergunta", "objetivo": "o que se busca provar/extrair", "tipo": "direta|provocativa|esclarecedora"}
  ],
  "estrategia": "descrição da estratégia geral para a audiência",
  "pontosCriticos": ["ponto crítico 1", "ponto crítico 2", ...],
  "alertas": ["alerta sobre a testemunha ou o depoimento esperado"]
}`,
        },
        {
          role: 'user',
          content: `Caso: ${caseData?.title}\nÁrea: ${caseData?.area}\nPartes: ${caseData?.plaintiff} vs ${caseData?.defendant}\n${witnessInfo}\n${caseData?.strategy ? `Estratégia do caso: ${caseData.strategy}` : ''}\n\nAutos:\n${context}`,
        },
      ],
      { temperature: 0.2, maxTokens: 2000 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return { perguntas: [], estrategia: result.content, pontosCriticos: [], alertas: [] };
    }
  }

  // ─── RADAR DE OPORTUNIDADES (CROSS-CASE) ──────────────────────────────────

  async detectOpportunities(userId: string) {
    const cases = await this.prisma.case.findMany({
      where: { userId, status: { not: CaseStatus.ARCHIVED } },
      select: {
        id: true,
        title: true,
        area: true,
        plaintiff: true,
        defendant: true,
        status: true,
        caseValue: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    if (cases.length === 0) {
      return { oportunidades: [] };
    }

    const caseSummaries = cases
      .map((c) => `ID:${c.id} | ${c.title} | Área:${c.area ?? 'N/A'} | Status:${c.status} | Criado:${c.createdAt.toISOString().slice(0, 10)}`)
      .join('\n');

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um consultor estratégico para um escritório de advocacia. Analise o portfólio de casos e identifique padrões e oportunidades.
Retorne APENAS um JSON válido com esta estrutura:
{
  "oportunidades": [
    {
      "tipo": "recurso|acordo|diligencia|prescricao|outros",
      "padrao": "descrição do padrão identificado",
      "recomendacao": "ação recomendada",
      "caseIds": ["id1", "id2"],
      "afetados": 0,
      "prioridade": "alta|media|baixa"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Portfólio de casos do escritório:\n${caseSummaries}`,
        },
      ],
      { temperature: 0.2, maxTokens: 2000 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return { oportunidades: [] };
    }
  }

  // ─── COPILOTO DO ESCRITÓRIO ───────────────────────────────────────────────

  async getOfficeCopilot(userId: string) {
    const cases = await this.prisma.case.findMany({
      where: { userId, status: { not: CaseStatus.ARCHIVED } },
      select: {
        id: true,
        title: true,
        area: true,
        status: true,
        caseValue: true,
        plaintiff: true,
        defendant: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { documents: true, messages: true, pieces: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const stats = {
      total: cases.length,
      porStatus: cases.reduce<Record<string, number>>((acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      }, {}),
      semDocumentos: cases.filter((c) => c._count.documents === 0).length,
    };

    if (cases.length === 0) {
      return {
        prazosUrgentes: [],
        casosAltoRisco: [],
        acoesRecomendadas: [],
        stats,
      };
    }

    const caseSummaries = cases
      .map(
        (c) =>
          `ID:${c.id} | ${c.title} | Status:${c.status} | Docs:${c._count.documents} | Msgs:${c._count.messages} | Atualizado:${c.updatedAt.toISOString().slice(0, 10)}`,
      )
      .join('\n');

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é o copiloto de um escritório de advocacia. Analise o portfólio e gere um briefing executivo.
Retorne APENAS um JSON válido com esta estrutura:
{
  "prazosUrgentes": [{"caseId": "...", "titulo": "...", "prazo": "descrição do prazo identificado", "urgencia": "critica|alta|media"}],
  "casosAltoRisco": [{"caseId": "...", "titulo": "...", "risco": "descrição do risco identificado", "nivel": "critico|alto|medio"}],
  "acoesRecomendadas": [{"caseId": "...", "titulo": "...", "acao": "ação específica recomendada", "prioridade": "alta|media|baixa"}]
}`,
        },
        {
          role: 'user',
          content: `Data atual: ${new Date().toISOString().slice(0, 10)}\n\nCasos do escritório:\n${caseSummaries}`,
        },
      ],
      { temperature: 0.15, maxTokens: 2500 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
      return { ...parsed, stats };
    } catch {
      return { prazosUrgentes: [], casosAltoRisco: [], acoesRecomendadas: [], stats };
    }
  }

  // ─── ANÁLISE DE ACORDO ────────────────────────────────────────────────────

  async analyzeSettlement(caseId: string, userId: string) {
    await this.assertOwnership(caseId, userId);

    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: {
        title: true,
        area: true,
        plaintiff: true,
        defendant: true,
        caseValue: true,
        strategy: true,
        notes: true,
      },
    });

    const chunks = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT cc.content FROM case_chunks cc
       INNER JOIN case_documents cd ON cd.id = cc.document_id
       WHERE cd.case_id = '${caseId}'::uuid AND cd.processing_status = 'INDEXED'
       ORDER BY cd.created_at ASC, cc.chunk_index ASC
       LIMIT 35`,
    );

    if (chunks.length === 0) {
      throw new BadRequestException('Nenhum documento indexado. Faça upload dos autos primeiro.');
    }

    const context = chunks.map((c) => c.content).join('\n\n---\n\n');
    const valorCausa = caseData?.caseValue
      ? `R$ ${Number(caseData.caseValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'não informado';

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um advogado especialista em negociações e acordos judiciais/extrajudiciais no Brasil.
Retorne APENAS um JSON válido com esta estrutura:
{
  "recomendacao": "acordo|litigio|depende",
  "valorSugerido": {"minimo": 0, "ideal": 0, "maximo": 0},
  "racional": "justificativa detalhada para a recomendação e valores sugeridos",
  "cenarios": [
    {"nome": "Acordo imediato", "probabilidade": "alta|media|baixa", "descricao": "...", "valorEstimado": 0},
    {"nome": "Sentença favorável", "probabilidade": "alta|media|baixa", "descricao": "...", "valorEstimado": 0},
    {"nome": "Sentença desfavorável", "probabilidade": "alta|media|baixa", "descricao": "...", "valorEstimado": 0}
  ],
  "fatoresRisco": ["fator 1", "fator 2", ...],
  "pontosFavoraveis": ["ponto 1", "ponto 2", ...]
}`,
        },
        {
          role: 'user',
          content: `Caso: ${caseData?.title}\nÁrea: ${caseData?.area}\nPartes: ${caseData?.plaintiff} vs ${caseData?.defendant}\nValor da causa: ${valorCausa}\n${caseData?.strategy ? `Estratégia: ${caseData.strategy}` : ''}\n\nAutos:\n${context}`,
        },
      ],
      { temperature: 0.15, maxTokens: 2500 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return {
        recomendacao: 'depende',
        valorSugerido: { minimo: 0, ideal: 0, maximo: 0 },
        racional: result.content,
        cenarios: [],
        fatoresRisco: [],
        pontosFavoraveis: [],
      };
    }
  }

  // ─── PREVISÃO DE INDENIZAÇÃO ──────────────────────────────────────────────

  async predictCompensation(dto: PredictCompensationDto) {
    const { tipo, estado, duracao, detalhes } = dto;

    const result = await this.aiProvider.generateChatCompletion(
      [
        {
          role: 'system',
          content: `Você é um especialista em jurisprudência brasileira de dano moral e indenizações.
Com base no seu conhecimento de milhares de decisões reais dos tribunais brasileiros, estime a faixa de indenização para o caso descrito.
Retorne APENAS um JSON válido com esta estrutura:
{
  "faixa": { "minimo": 0, "maximo": 0, "texto": "R$ X.XXX – R$ Y.YYY" },
  "valorMedio": 0,
  "fundamentacao": "explicação baseada em jurisprudência do tribunal indicado",
  "precedentes": [
    { "tribunal": "TJSP", "ano": 2023, "valorMinimo": 0, "valorMaximo": 0, "observacao": "breve descrição do caso" }
  ],
  "fatoresQueAumentam": ["fator 1", "fator 2"],
  "fatoresQueReduzem": ["fator 1", "fator 2"],
  "observacoes": "considerações adicionais"
}
Use valores realistas baseados na jurisprudência brasileira atual. Considere o tribunal do estado informado.`,
        },
        {
          role: 'user',
          content: `Tipo de caso: ${tipo}\nEstado: ${estado}${duracao ? `\nDuração: ${duracao}` : ''}${detalhes ? `\nDetalhes adicionais: ${detalhes}` : ''}`,
        },
      ],
      { temperature: 0.1, maxTokens: 2000 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.content);
    } catch {
      return {
        faixa: { minimo: 0, maximo: 0, texto: 'Não foi possível calcular' },
        valorMedio: 0,
        fundamentacao: result.content,
        precedentes: [],
        fatoresQueAumentam: [],
        fatoresQueReduzem: [],
        observacoes: '',
      };
    }
  }

  // ─── PRIVADOS ─────────────────────────────────────────────────────────────

  private async assertOwnership(caseId: string, userId: string) {
    const c = await this.prisma.case.findUnique({ where: { id: caseId }, select: { userId: true } });
    if (!c) throw new NotFoundException('Caso não encontrado');
    if (c.userId !== userId) throw new ForbiddenException('Acesso negado');
  }

  private async getRecentHistory(caseId: string) {
    const messages = await this.prisma.caseMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { role: true, content: true },
    });

    return messages.reverse().map((m) => ({
      role: m.role === MessageRole.USER ? ('user' as const) : ('assistant' as const),
      content: m.content,
    }));
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
      const result = await this.pdfProcessor.process(buffer);
      return result.text;
    }
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType.includes('docx')
    ) {
      const result = await this.docxProcessor.process(buffer);
      return result.text;
    }
    const result = await this.textProcessor.process(buffer);
    return result.text;
  }

  private createBatches<T>(items: T[], size: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      batches.push(items.slice(i, i + size));
    }
    return batches;
  }
}

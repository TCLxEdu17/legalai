import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CasesService } from './cases.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkingService } from '../rag/chunking.service';
import { PdfProcessor } from '../uploads/processors/pdf.processor';
import { DocxProcessor } from '../uploads/processors/docx.processor';
import { TextProcessor } from '../uploads/processors/text.processor';
import { AI_PROVIDER_TOKEN } from '../rag/providers/ai-provider.interface';

const mockPrisma = {
  case: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  caseDocument: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  caseChunk: {
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  caseMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  casePiece: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
};

const mockAIProvider = {
  generateEmbedding: jest.fn(),
  generateEmbeddings: jest.fn(),
  generateChatCompletion: jest.fn(),
};

const mockChunkingService = { chunkText: jest.fn() };
const mockPdfProcessor = { process: jest.fn() };
const mockDocxProcessor = { process: jest.fn() };
const mockTextProcessor = { process: jest.fn() };

const MOCK_USER_ID = 'user-123';
const MOCK_CASE_ID = 'case-abc';

describe('CasesService — Advanced AI Features', () => {
  let service: CasesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ChunkingService, useValue: mockChunkingService },
        { provide: PdfProcessor, useValue: mockPdfProcessor },
        { provide: DocxProcessor, useValue: mockDocxProcessor },
        { provide: TextProcessor, useValue: mockTextProcessor },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
    jest.clearAllMocks();
  });

  function setupOwnership() {
    mockPrisma.case.findUnique.mockResolvedValue({ userId: MOCK_USER_ID, title: 'Caso Teste', area: 'Cível', plaintiff: 'João', defendant: 'Banco', court: 'TJSP', processNumber: '0001/2024', caseValue: 50000, strategy: null, notes: null, createdAt: new Date(), _count: { documents: 1, messages: 0, pieces: 0 } });
  }

  function setupChunks(chunks = [{ content: 'Fato relevante do processo.', doc_title: 'Petição', doc_type: 'PETICAO_INICIAL' }]) {
    mockPrisma.$queryRawUnsafe.mockResolvedValue(chunks);
  }

  function setupAI(jsonResponse: object) {
    mockAIProvider.generateChatCompletion.mockResolvedValue({
      content: JSON.stringify(jsonResponse),
      inputTokens: 100,
      outputTokens: 200,
      model: 'gpt-4o',
    });
  }

  // ─── buildLegalNarrative ──────────────────────────────────────────────────

  describe('buildLegalNarrative', () => {
    it('retorna narrativa estruturada quando há documentos indexados', async () => {
      setupOwnership();
      setupChunks();
      setupAI({
        narrativa: 'Em 01/01/2024, o autor...',
        enquadramentoJuridico: 'Art. 927 do CC',
        pontosChave: ['Dano comprovado'],
        recomendacaoEstrategica: 'Priorizar dano moral',
      });

      const result = await service.buildLegalNarrative(MOCK_CASE_ID, MOCK_USER_ID);

      expect(result.narrativa).toBe('Em 01/01/2024, o autor...');
      expect(result.pontosChave).toHaveLength(1);
      expect(mockAIProvider.generateChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('lança BadRequestException quando não há documentos', async () => {
      setupOwnership();
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(service.buildLegalNarrative(MOCK_CASE_ID, MOCK_USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('lança ForbiddenException para usuário sem acesso', async () => {
      mockPrisma.case.findUnique.mockResolvedValue({ userId: 'outro-user' });

      await expect(service.buildLegalNarrative(MOCK_CASE_ID, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('retorna fallback quando AI retorna JSON inválido', async () => {
      setupOwnership();
      setupChunks();
      mockAIProvider.generateChatCompletion.mockResolvedValue({ content: 'texto não JSON', inputTokens: 50, outputTokens: 50, model: 'gpt-4o' });

      const result = await service.buildLegalNarrative(MOCK_CASE_ID, MOCK_USER_ID);

      expect(result.narrativa).toBe('texto não JSON');
      expect(result.pontosChave).toEqual([]);
    });
  });

  // ─── analyzeEvidence ─────────────────────────────────────────────────────

  describe('analyzeEvidence', () => {
    it('retorna análise de provas estruturada', async () => {
      setupOwnership();
      setupChunks();
      setupAI({
        provasNecessarias: ['Nota fiscal', 'Laudo'],
        provasPresentes: [{ descricao: 'Contrato', documento: 'doc-1', forca: 'forte' }],
        provasFaltando: [{ descricao: 'Laudo pericial', urgencia: 'alta', sugestao: 'Requerer prova pericial' }],
        alertas: ['Prazo para produção de prova se aproximando'],
        avaliacaoGeral: 'adequada',
      });

      const result = await service.analyzeEvidence(MOCK_CASE_ID, MOCK_USER_ID);

      expect(result.provasNecessarias).toHaveLength(2);
      expect(result.provasPresentes[0].forca).toBe('forte');
      expect(result.avaliacaoGeral).toBe('adequada');
    });

    it('lança BadRequestException sem documentos', async () => {
      setupOwnership();
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(service.analyzeEvidence(MOCK_CASE_ID, MOCK_USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── detectLegalTheses ───────────────────────────────────────────────────

  describe('detectLegalTheses', () => {
    it('retorna teses jurídicas com confiança', async () => {
      setupOwnership();
      setupChunks();
      setupAI({
        teses: [
          { nome: 'Responsabilidade objetiva', descricao: 'CDC art. 14', leis: ['Art. 14 CDC'], confianca: 0.9, favorabilidade: 'autor' },
        ],
      });

      const result = await service.detectLegalTheses(MOCK_CASE_ID, MOCK_USER_ID);

      expect(result.teses).toHaveLength(1);
      expect(result.teses[0].confianca).toBe(0.9);
    });

    it('retorna teses vazias para JSON inválido', async () => {
      setupOwnership();
      setupChunks();
      mockAIProvider.generateChatCompletion.mockResolvedValue({ content: 'sem json', inputTokens: 10, outputTokens: 10, model: 'gpt-4o' });

      const result = await service.detectLegalTheses(MOCK_CASE_ID, MOCK_USER_ID);

      expect(result.teses).toEqual([]);
    });
  });

  // ─── generateHearingQuestions ─────────────────────────────────────────────

  describe('generateHearingQuestions', () => {
    it('retorna perguntas e estratégia para testemunha', async () => {
      setupOwnership();
      setupChunks();
      setupAI({
        perguntas: [{ pergunta: 'O sr. esteve presente?', objetivo: 'Confirmar presença', tipo: 'direta' }],
        estrategia: 'Explorar inconsistências',
        pontosCriticos: ['Testemunha pode ser hostil'],
        alertas: [],
      });

      const result = await service.generateHearingQuestions(MOCK_CASE_ID, { witnessName: 'José', witnessRole: 'Sócio' }, MOCK_USER_ID);

      expect(result.perguntas).toHaveLength(1);
      expect(result.estrategia).toBe('Explorar inconsistências');
    });

    it('lança BadRequestException sem documentos', async () => {
      setupOwnership();
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(service.generateHearingQuestions(MOCK_CASE_ID, {}, MOCK_USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── detectOpportunities ─────────────────────────────────────────────────

  describe('detectOpportunities', () => {
    it('retorna oportunidades quando há casos', async () => {
      mockPrisma.case.findMany.mockResolvedValue([
        { id: 'c1', title: 'Caso A', area: 'Trabalhista', plaintiff: 'Maria', defendant: 'Empresa', status: 'ACTIVE', caseValue: null, createdAt: new Date() },
        { id: 'c2', title: 'Caso B', area: 'Trabalhista', plaintiff: 'Pedro', defendant: 'Empresa', status: 'ACTIVE', caseValue: null, createdAt: new Date() },
      ]);
      setupAI({
        oportunidades: [{ tipo: 'recurso', padrao: 'Casos trabalhistas similares', recomendacao: 'Consolidar argumentos', caseIds: ['c1', 'c2'], afetados: 2, prioridade: 'alta' }],
      });

      const result = await service.detectOpportunities(MOCK_USER_ID);

      expect(result.oportunidades).toHaveLength(1);
      expect(result.oportunidades[0].afetados).toBe(2);
    });

    it('retorna oportunidades vazias sem casos', async () => {
      mockPrisma.case.findMany.mockResolvedValue([]);

      const result = await service.detectOpportunities(MOCK_USER_ID);

      expect(result.oportunidades).toEqual([]);
      expect(mockAIProvider.generateChatCompletion).not.toHaveBeenCalled();
    });
  });

  // ─── getOfficeCopilot ────────────────────────────────────────────────────

  describe('getOfficeCopilot', () => {
    it('retorna briefing do escritório com stats', async () => {
      mockPrisma.case.findMany.mockResolvedValue([
        { id: 'c1', title: 'Caso A', area: 'Cível', status: 'ACTIVE', caseValue: null, plaintiff: 'A', defendant: 'B', createdAt: new Date(), updatedAt: new Date(), _count: { documents: 2, messages: 5, pieces: 1 } },
      ]);
      setupAI({
        prazosUrgentes: [{ caseId: 'c1', titulo: 'Caso A', prazo: 'Contestação vence em 3 dias', urgencia: 'critica' }],
        casosAltoRisco: [],
        acoesRecomendadas: [{ caseId: 'c1', titulo: 'Caso A', acao: 'Protocolar contestação', prioridade: 'alta' }],
      });

      const result = await service.getOfficeCopilot(MOCK_USER_ID);

      expect(result.prazosUrgentes).toHaveLength(1);
      expect(result.stats.total).toBe(1);
      expect(result.stats.semDocumentos).toBe(0);
    });

    it('retorna estrutura vazia sem casos', async () => {
      mockPrisma.case.findMany.mockResolvedValue([]);

      const result = await service.getOfficeCopilot(MOCK_USER_ID);

      expect(result.prazosUrgentes).toEqual([]);
      expect(result.stats.total).toBe(0);
      expect(mockAIProvider.generateChatCompletion).not.toHaveBeenCalled();
    });
  });

  // ─── analyzeSettlement ───────────────────────────────────────────────────

  describe('analyzeSettlement', () => {
    it('retorna análise de acordo com cenários', async () => {
      setupOwnership();
      setupChunks();
      setupAI({
        recomendacao: 'acordo',
        valorSugerido: { minimo: 10000, ideal: 25000, maximo: 40000 },
        racional: 'Posição probatória favorável ao acordo',
        cenarios: [
          { nome: 'Acordo imediato', probabilidade: 'alta', descricao: 'Rápido', valorEstimado: 25000 },
        ],
        fatoresRisco: ['Testemunha incerta'],
        pontosFavoraveis: ['Contrato assinado'],
      });

      const result = await service.analyzeSettlement(MOCK_CASE_ID, MOCK_USER_ID);

      expect(result.recomendacao).toBe('acordo');
      expect(result.valorSugerido.ideal).toBe(25000);
      expect(result.cenarios).toHaveLength(1);
    });

    it('lança BadRequestException sem documentos', async () => {
      setupOwnership();
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(service.analyzeSettlement(MOCK_CASE_ID, MOCK_USER_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── predictCompensation ─────────────────────────────────────────────────

  describe('predictCompensation', () => {
    it('retorna faixa de indenização para entrada válida', async () => {
      setupAI({
        faixa: { minimo: 5200, maximo: 9000, texto: 'R$ 5.200 – R$ 9.000' },
        valorMedio: 7100,
        fundamentacao: 'Baseado em decisões do TJSP sobre negativação indevida',
        precedentes: [
          { tribunal: 'TJSP', ano: 2023, valorMinimo: 5000, valorMaximo: 8000, observacao: 'Negativação sem aviso' },
        ],
        fatoresQueAumentam: ['Duração prolongada', 'Múltiplas negativações'],
        fatoresQueReduzem: ['Ausência de comprovação de dano efetivo'],
        observacoes: 'Valores variam conforme provas e posição processual.',
      });

      const result = await service.predictCompensation({ tipo: 'negativação indevida', estado: 'SP', duracao: '3 meses' });

      expect(result.faixa.minimo).toBe(5200);
      expect(result.faixa.maximo).toBe(9000);
      expect(result.faixa.texto).toBe('R$ 5.200 – R$ 9.000');
      expect(result.precedentes).toHaveLength(1);
      expect(result.fatoresQueAumentam.length).toBeGreaterThan(0);
      expect(mockAIProvider.generateChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('funciona sem campos opcionais (sem duração e detalhes)', async () => {
      setupAI({
        faixa: { minimo: 3000, maximo: 8000, texto: 'R$ 3.000 – R$ 8.000' },
        valorMedio: 5500,
        fundamentacao: 'Jurisprudência do TJRJ',
        precedentes: [],
        fatoresQueAumentam: [],
        fatoresQueReduzem: [],
        observacoes: '',
      });

      const result = await service.predictCompensation({ tipo: 'acidente de trânsito', estado: 'RJ' });

      expect(result.faixa.minimo).toBe(3000);
      expect(result.faixa.maximo).toBe(8000);
      expect(result.precedentes).toEqual([]);
    });

    it('retorna fallback quando AI retorna JSON inválido', async () => {
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'não é um JSON',
        inputTokens: 50,
        outputTokens: 50,
        model: 'gpt-4o',
      });

      const result = await service.predictCompensation({ tipo: 'dano moral', estado: 'MG' });

      expect(result.faixa.minimo).toBe(0);
      expect(result.faixa.maximo).toBe(0);
      expect(result.fundamentacao).toBe('não é um JSON');
      expect(result.precedentes).toEqual([]);
    });

    it('inclui tipo, estado e duração no prompt enviado à AI', async () => {
      setupAI({
        faixa: { minimo: 1000, maximo: 5000, texto: 'R$ 1.000 – R$ 5.000' },
        valorMedio: 3000,
        fundamentacao: 'test',
        precedentes: [],
        fatoresQueAumentam: [],
        fatoresQueReduzem: [],
        observacoes: '',
      });

      await service.predictCompensation({ tipo: 'cobrança indevida', estado: 'RS', duracao: '6 meses', detalhes: 'Cartão de crédito cancelado' });

      const callArgs = mockAIProvider.generateChatCompletion.mock.calls[0][0];
      const userMessage = callArgs[1].content as string;
      expect(userMessage).toContain('cobrança indevida');
      expect(userMessage).toContain('RS');
      expect(userMessage).toContain('6 meses');
      expect(userMessage).toContain('Cartão de crédito cancelado');
    });
  });

  // ─── generatePiece com estilo ─────────────────────────────────────────────

  describe('generatePiece — estilo de redação', () => {
    it('inclui instrução de estilo formal_classico no prompt', async () => {
      setupOwnership();
      setupChunks([{ content: 'conteúdo do processo', doc_title: 'Peticao', doc_type: 'PETICAO_INICIAL' }] as any);
      mockAIProvider.generateChatCompletion.mockResolvedValue({ content: 'Peça gerada', inputTokens: 100, outputTokens: 500, model: 'gpt-4o' });
      mockPrisma.casePiece.create.mockResolvedValue({ id: 'piece-1', title: 'Contestação', pieceType: 'CONTESTACAO', content: 'Peça gerada', prompt: null, caseId: MOCK_CASE_ID, createdAt: new Date(), updatedAt: new Date() });

      await service.generatePiece(MOCK_CASE_ID, { pieceType: 'CONTESTACAO' as any, title: 'Contestação Teste', style: 'formal_classico' }, MOCK_USER_ID);

      const callArgs = mockAIProvider.generateChatCompletion.mock.calls[0][0];
      const systemPrompt = callArgs[0].content as string;
      expect(systemPrompt).toContain('linguagem jurídica clássica');
    });

    it('inclui estilo customizado no prompt', async () => {
      setupOwnership();
      setupChunks([{ content: 'conteúdo', doc_title: 'Doc', doc_type: 'OUTROS' }] as any);
      mockAIProvider.generateChatCompletion.mockResolvedValue({ content: 'Peça', inputTokens: 100, outputTokens: 500, model: 'gpt-4o' });
      mockPrisma.casePiece.create.mockResolvedValue({ id: 'piece-2', title: 'Peça Custom', pieceType: 'OUTROS', content: 'Peça', prompt: null, caseId: MOCK_CASE_ID, createdAt: new Date(), updatedAt: new Date() });

      await service.generatePiece(MOCK_CASE_ID, { pieceType: 'OUTROS' as any, title: 'Peça Custom', style: 'custom', customStyle: 'Use muitas citações doutrinárias' }, MOCK_USER_ID);

      const callArgs = mockAIProvider.generateChatCompletion.mock.calls[0][0];
      const systemPrompt = callArgs[0].content as string;
      expect(systemPrompt).toContain('Use muitas citações doutrinárias');
    });
  });
});

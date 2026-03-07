import { Test } from '@nestjs/testing';
import { RagService } from './rag.service';
import { VectorSearchService } from './vector-search.service';
import { AI_PROVIDER_TOKEN } from './providers/ai-provider.interface';

const mockVectorSearch = {
  search: jest.fn(),
};

const mockAIProvider = {
  generateEmbedding: jest.fn(),
  generateEmbeddings: jest.fn(),
  generateChatCompletion: jest.fn(),
};

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: VectorSearchService, useValue: mockVectorSearch },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
    jest.clearAllMocks();
  });

  describe('query', () => {
    it('deve retornar resposta com fontes quando chunks são encontrados', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          chunkIndex: 0,
          content: 'O STJ decidiu que...',
          similarity: 0.92,
          metadata: {},
          document: {
            id: 'doc-1',
            title: 'REsp 12345/SP',
            tribunal: 'STJ',
            processNumber: 'REsp 12345/SP',
            relator: 'Min. João Silva',
            judgmentDate: new Date('2023-06-15'),
            theme: 'Responsabilidade Civil',
            keywords: [],
          },
        },
      ];

      mockVectorSearch.search.mockResolvedValue(mockChunks);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: '## Resumo Objetivo\nO STJ entende que...',
        inputTokens: 500,
        outputTokens: 300,
        model: 'gpt-4o',
      });

      const result = await service.query('Qual o entendimento do STJ sobre responsabilidade civil?');

      expect(result.answer).toContain('STJ');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].documentId).toBe('doc-1');
      expect(result.retrievedChunks).toBe(1);
      expect(result.confidence).toBe('low'); // 1 chunk = low
    });

    it('deve retornar confidence=none quando não encontra chunks', async () => {
      mockVectorSearch.search.mockResolvedValue([]);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Não foram encontradas jurisprudências relevantes.',
        inputTokens: 100,
        outputTokens: 50,
        model: 'gpt-4o',
      });

      const result = await service.query('Pergunta sem contexto na base');

      expect(result.confidence).toBe('none');
      expect(result.sources).toHaveLength(0);
    });

    it('deve agrupar fontes de mesmo documento', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          chunkIndex: 0,
          content: 'Primeiro trecho...',
          similarity: 0.95,
          metadata: {},
          document: { id: 'doc-1', title: 'REsp 1', tribunal: 'STJ', processNumber: null, relator: null, judgmentDate: null, theme: null, keywords: [] },
        },
        {
          id: 'chunk-2',
          documentId: 'doc-1',
          chunkIndex: 1,
          content: 'Segundo trecho do mesmo doc...',
          similarity: 0.88,
          metadata: {},
          document: { id: 'doc-1', title: 'REsp 1', tribunal: 'STJ', processNumber: null, relator: null, judgmentDate: null, theme: null, keywords: [] },
        },
      ];

      mockVectorSearch.search.mockResolvedValue(mockChunks);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Resposta baseada em dois trechos.',
        inputTokens: 400,
        outputTokens: 200,
        model: 'gpt-4o',
      });

      const result = await service.query('Pergunta de teste');

      expect(result.sources).toHaveLength(1); // 2 chunks do mesmo doc → 1 fonte
      expect(result.sources[0].excerpts).toHaveLength(2);
    });
  });
});

import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AI_PROVIDER_TOKEN } from '../rag/providers/ai-provider.interface';

const mockPrisma = {
  jurisprudenceDocument: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  jurisprudenceChunk: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockStorageService = {
  deleteFile: jest.fn(),
};

const mockAIProvider = {
  generateChatCompletion: jest.fn(),
};

const MOCK_DOC = {
  id: 'doc-1',
  title: 'Acórdão STJ 1234',
  fileName: 'acordao.pdf',
  fileType: 'application/pdf',
  fileSize: 1024,
  filePath: 's3://bucket/acordao.pdf',
  tribunal: 'STJ',
  processNumber: '1234/2023',
  relator: 'Min. João',
  judgmentDate: new Date('2023-06-15'),
  theme: 'Consumidor',
  keywords: ['CDC', 'responsabilidade'],
  uploadStatus: 'COMPLETED',
  processingStatus: 'INDEXED',
  processingError: null,
  chunkCount: 5,
  sourceType: 'UPLOAD',
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
  _count: { chunks: 5 },
};

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('retorna documentos com paginação padrão', async () => {
      mockPrisma.jurisprudenceDocument.findMany.mockResolvedValue([MOCK_DOC]);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('filtra por texto de busca', async () => {
      mockPrisma.jurisprudenceDocument.findMany.mockResolvedValue([MOCK_DOC]);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(1);

      await service.findAll({ search: 'STJ' });

      const callArgs = mockPrisma.jurisprudenceDocument.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
    });

    it('filtra por tribunal', async () => {
      mockPrisma.jurisprudenceDocument.findMany.mockResolvedValue([MOCK_DOC]);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(1);

      await service.findAll({ tribunal: 'STJ' });

      const callArgs = mockPrisma.jurisprudenceDocument.findMany.mock.calls[0][0];
      expect(callArgs.where.tribunal).toBeDefined();
    });

    it('limita paginação a 100 itens por página', async () => {
      mockPrisma.jurisprudenceDocument.findMany.mockResolvedValue([]);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(0);

      await service.findAll({ limit: 9999 });

      const callArgs = mockPrisma.jurisprudenceDocument.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('calcula hasPrev e hasNext corretamente', async () => {
      mockPrisma.jurisprudenceDocument.findMany.mockResolvedValue([MOCK_DOC]);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.hasNext).toBe(true);
    });
  });

  describe('findById', () => {
    it('retorna documento pelo id', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(MOCK_DOC);

      const result = await service.findById('doc-1');

      expect(result.title).toBe('Acórdão STJ 1234');
    });

    it('lança NotFoundException para documento inexistente', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(null);

      await expect(service.findById('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('permite dono deletar próprio documento', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(MOCK_DOC);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrisma.jurisprudenceDocument.delete.mockResolvedValue(MOCK_DOC);

      await service.delete('doc-1', 'user-1', 'USER');

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith(MOCK_DOC.filePath);
      expect(mockPrisma.jurisprudenceDocument.delete).toHaveBeenCalledTimes(1);
    });

    it('permite ADMIN deletar documento de qualquer usuário', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(MOCK_DOC);
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrisma.jurisprudenceDocument.delete.mockResolvedValue(MOCK_DOC);

      await service.delete('doc-1', 'outro-admin', 'ADMIN');

      expect(mockPrisma.jurisprudenceDocument.delete).toHaveBeenCalledTimes(1);
    });

    it('lança ForbiddenException ao deletar documento de outro usuário', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(MOCK_DOC);

      await expect(service.delete('doc-1', 'outro-user', 'USER')).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException para documento inexistente', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(null);

      await expect(service.delete('nao-existe', 'user-1', 'USER')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateSummary', () => {
    it('gera resumo com base nos chunks do documento', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(MOCK_DOC);
      mockPrisma.jurisprudenceChunk.findMany.mockResolvedValue([
        { content: 'Conteúdo jurídico relevante.' },
        { content: 'Segundo parágrafo importante.' },
      ]);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Resumo: Este acórdão trata de responsabilidade do consumidor.',
        inputTokens: 100,
        outputTokens: 50,
        model: 'gpt-4o',
      });

      const result = await service.generateSummary('doc-1');

      expect(result.summary).toContain('Resumo');
      expect(mockAIProvider.generateChatCompletion).toHaveBeenCalledTimes(1);
    });

    it('usa título como fallback quando não há chunks', async () => {
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue(MOCK_DOC);
      mockPrisma.jurisprudenceChunk.findMany.mockResolvedValue([]);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Resumo baseado no título.',
        inputTokens: 10,
        outputTokens: 20,
        model: 'gpt-4o',
      });

      const result = await service.generateSummary('doc-1');

      expect(result.summary).toBeDefined();
      const prompt = mockAIProvider.generateChatCompletion.mock.calls[0][0][0].content as string;
      expect(prompt).toContain(MOCK_DOC.title);
    });
  });

  describe('getStats', () => {
    it('retorna estatísticas agregadas dos documentos', async () => {
      mockPrisma.jurisprudenceDocument.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10)  // newThisWeek
        .mockResolvedValueOnce(40); // newThisMonth
      mockPrisma.jurisprudenceDocument.groupBy
        .mockResolvedValueOnce([{ processingStatus: 'INDEXED', _count: 90 }]) // byStatus
        .mockResolvedValueOnce([{ tribunal: 'STJ', _count: 50 }]) // byTribunal
        .mockResolvedValueOnce([{ theme: 'Consumidor', _count: 30 }]) // byTheme
        .mockResolvedValueOnce([{ sourceType: 'UPLOAD', _count: 100 }]); // bySource
      mockPrisma.jurisprudenceChunk.count.mockResolvedValue(500);

      const result = await service.getStats();

      expect(result.totalDocuments).toBe(100);
      expect(result.totalChunks).toBe(500);
      expect(result.growth.lastWeek).toBe(10);
      expect(result.growth.lastMonth).toBe(40);
      expect(result.byStatus['INDEXED']).toBe(90);
    });
  });
});

import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RagService } from '../rag/rag.service';

const mockPrisma = {
  chatMessage: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  chatSession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockRagService = {
  query: jest.fn(),
};

const MOCK_USER_ID = 'user-1';
const MOCK_SESSION_ID = 'session-1';

const MOCK_SESSION = {
  id: MOCK_SESSION_ID,
  userId: MOCK_USER_ID,
  title: 'Nova consulta',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_RAG_RESULT = {
  answer: 'Resposta da IA sobre o tema jurídico.',
  sources: [{ title: 'Acórdão 123', documentId: 'doc-1', chunkId: 'chunk-1', similarity: 0.9, tribunal: 'STJ', processNumber: '1234/2023', relator: 'Min. X', judgmentDate: null, theme: 'Consumidor', excerpt: '...' }],
  retrievedChunks: 1,
  confidence: 'high' as const,
  tokensUsed: { input: 100, output: 200 },
  model: 'gpt-4o',
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('cria nova sessão e responde com RAG quando sem sessionId', async () => {
      mockPrisma.chatSession.create.mockResolvedValue(MOCK_SESSION);
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'msg-1', content: 'Pergunta', role: 'USER', createdAt: new Date() });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      mockRagService.query.mockResolvedValue(MOCK_RAG_RESULT);
      mockPrisma.chatSession.update.mockResolvedValue(MOCK_SESSION);

      const result = await service.sendMessage({ message: 'Qual é meu direito?' }, MOCK_USER_ID);

      expect(result.sessionId).toBe(MOCK_SESSION_ID);
      expect(result.message.content).toBe(MOCK_RAG_RESULT.answer);
      expect(result.message.confidence).toBe('high');
      expect(mockRagService.query).toHaveBeenCalledTimes(1);
    });

    it('reutiliza sessão existente quando sessionId fornecido', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(MOCK_SESSION);
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'msg-2', content: 'Pergunta', role: 'USER', createdAt: new Date() });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      mockRagService.query.mockResolvedValue(MOCK_RAG_RESULT);

      const result = await service.sendMessage(
        { message: 'Segunda pergunta', sessionId: MOCK_SESSION_ID },
        MOCK_USER_ID,
      );

      expect(result.sessionId).toBe(MOCK_SESSION_ID);
      expect(mockPrisma.chatSession.create).not.toHaveBeenCalled();
    });

    it('retorna resposta de erro amigável quando RAG falha', async () => {
      mockPrisma.chatSession.create.mockResolvedValue(MOCK_SESSION);
      mockPrisma.chatMessage.create.mockResolvedValue({ id: 'msg-3', content: 'X', role: 'USER', createdAt: new Date() });
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      mockRagService.query.mockRejectedValue(new Error('OpenAI timeout'));
      mockPrisma.chatSession.update.mockResolvedValue(MOCK_SESSION);

      const result = await service.sendMessage({ message: 'Pergunta com falha' }, MOCK_USER_ID);

      expect(result.message.error).toBe(true);
      expect(result.message.content).toContain('Ocorreu um erro');
    });

    it('lança ForbiddenException ao acessar sessão de outro usuário', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue({ ...MOCK_SESSION, userId: 'outro-user' });

      await expect(
        service.sendMessage({ message: 'Teste', sessionId: MOCK_SESSION_ID }, MOCK_USER_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSessions', () => {
    it('retorna sessões ativas do usuário', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([
        { id: MOCK_SESSION_ID, title: 'Sessão 1', createdAt: new Date(), updatedAt: new Date(), _count: { messages: 3 } },
      ]);

      const result = await service.getSessions(MOCK_USER_ID);

      expect(result).toHaveLength(1);
      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: MOCK_USER_ID, isActive: true } }),
      );
    });
  });

  describe('getSessionMessages', () => {
    it('retorna mensagens de uma sessão do usuário', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(MOCK_SESSION);
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { id: 'msg-1', role: 'USER', content: 'Pergunta', createdAt: new Date() },
        { id: 'msg-2', role: 'ASSISTANT', content: 'Resposta', createdAt: new Date() },
      ]);

      const result = await service.getSessionMessages(MOCK_SESSION_ID, MOCK_USER_ID);

      expect(result.messages).toHaveLength(2);
      expect(result.session.id).toBe(MOCK_SESSION_ID);
    });

    it('lança NotFoundException para sessão inexistente', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(null);

      await expect(service.getSessionMessages('nao-existe', MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSession', () => {
    it('desativa sessão (soft delete)', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue(MOCK_SESSION);
      mockPrisma.chatSession.update.mockResolvedValue({ ...MOCK_SESSION, isActive: false });

      await service.deleteSession(MOCK_SESSION_ID, MOCK_USER_ID);

      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: MOCK_SESSION_ID },
        data: { isActive: false },
      });
    });

    it('lança ForbiddenException ao deletar sessão de outro usuário', async () => {
      mockPrisma.chatSession.findUnique.mockResolvedValue({ ...MOCK_SESSION, userId: 'outro-user' });

      await expect(service.deleteSession(MOCK_SESSION_ID, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });
  });
});

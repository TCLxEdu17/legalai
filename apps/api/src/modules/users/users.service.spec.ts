import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  chatMessage: { count: jest.fn(), deleteMany: jest.fn() },
  chatSession: { deleteMany: jest.fn() },
  apiKey: { deleteMany: jest.fn() },
  refreshToken: { deleteMany: jest.fn() },
  jurisprudenceDocument: { count: jest.fn() },
  usageLog: { count: jest.fn() },
  $transaction: jest.fn(),
};

const MOCK_USER = {
  id: 'user-1',
  name: 'Maria Silva',
  email: 'maria@test.com',
  role: 'USER',
  isActive: true,
  prefix: null,
  oabNumber: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { uploadedDocuments: 0, chatSessions: 0 },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('retorna lista de usuários', async () => {
      mockPrisma.user.findMany.mockResolvedValue([MOCK_USER]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('retorna usuário pelo id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      const result = await service.findById('user-1');

      expect(result.email).toBe('maria@test.com');
    });

    it('lança NotFoundException para id inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria usuário com sucesso', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(MOCK_USER);

      const result = await service.create({
        name: 'Maria Silva',
        email: 'maria@test.com',
        password: 'SenhaForte@123',
      });

      expect(result.email).toBe('maria@test.com');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('lança ConflictException para email duplicado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);

      await expect(
        service.create({ name: 'Maria', email: 'maria@test.com', password: 'Abc@1234' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('atualiza dados do usuário', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.user.update.mockResolvedValue({ ...MOCK_USER, name: 'Maria Atualizada' });

      const result = await service.update('user-1', { name: 'Maria Atualizada' });

      expect(result.name).toBe('Maria Atualizada');
    });

    it('lança NotFoundException ao atualizar usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('nao-existe', { name: 'Teste' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPlanInfo', () => {
    it('retorna informações do plano e uso mensal', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...MOCK_USER, plan: 'basic' });
      mockPrisma.chatMessage.count.mockResolvedValue(10);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(2);
      mockPrisma.usageLog.count.mockResolvedValue(50);

      const result = await service.getPlanInfo('user-1');

      expect(result.plan).toBe('basic');
      expect(result.usage.chatMessages).toBe(10);
      expect(result.limits.chatMessages).toBe(200);
    });

    it('usa plano trial como padrão', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.chatMessage.count.mockResolvedValue(0);
      mockPrisma.jurisprudenceDocument.count.mockResolvedValue(0);
      mockPrisma.usageLog.count.mockResolvedValue(0);

      const result = await service.getPlanInfo('user-1');

      expect(result.plan).toBe('trial');
      expect(result.limits.chatMessages).toBe(20);
    });
  });

  describe('deleteAccount', () => {
    it('exclui conta em cascata', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_USER);
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.deleteAccount('user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('lança NotFoundException ao deletar usuário inexistente', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});

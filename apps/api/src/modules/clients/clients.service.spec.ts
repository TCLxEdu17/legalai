import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  client: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const MOCK_CLIENT = {
  id: 'client-1',
  userId: 'user-1',
  name: 'João Advogado',
  cpfCnpj: '123.456.789-00',
  email: 'joao@test.com',
  phone: null,
  address: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ClientsService', () => {
  let service: ClientsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('retorna todos os clientes do usuário', async () => {
      mockPrisma.client.findMany.mockResolvedValue([MOCK_CLIENT]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });

    it('filtra por busca textual', async () => {
      mockPrisma.client.findMany.mockResolvedValue([MOCK_CLIENT]);

      await service.findAll('user-1', 'João');

      const callArgs = mockPrisma.client.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
    });

    it('retorna lista vazia quando não há clientes', async () => {
      mockPrisma.client.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('retorna cliente por id e userId', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(MOCK_CLIENT);

      const result = await service.findOne('user-1', 'client-1');

      expect(result.name).toBe('João Advogado');
    });

    it('lança NotFoundException para cliente inexistente', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('cria cliente com userId', async () => {
      mockPrisma.client.create.mockResolvedValue(MOCK_CLIENT);

      const result = await service.create('user-1', { name: 'João Advogado', email: 'joao@test.com' });

      expect(mockPrisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
      expect(result.name).toBe('João Advogado');
    });
  });

  describe('update', () => {
    it('atualiza cliente existente', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(MOCK_CLIENT);
      mockPrisma.client.update.mockResolvedValue({ ...MOCK_CLIENT, name: 'João Atualizado' });

      const result = await service.update('user-1', 'client-1', { name: 'João Atualizado' });

      expect(result.name).toBe('João Atualizado');
    });

    it('lança NotFoundException ao atualizar cliente inexistente', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.update('user-1', 'nao-existe', { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('remove cliente existente', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(MOCK_CLIENT);
      mockPrisma.client.delete.mockResolvedValue(MOCK_CLIENT);

      await service.remove('user-1', 'client-1');

      expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: 'client-1' } });
    });

    it('lança NotFoundException ao remover cliente inexistente', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});

import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';

const mockPrisma = {
  apiKey: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const MOCK_KEY_ID = 'key-uuid-1';
const MOCK_USER_ID = 'user-uuid-1';

describe('ApiKeysService', () => {
  let service: ApiKeysService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('cria API key e retorna valor raw apenas uma vez', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: MOCK_KEY_ID,
        name: 'Minha API',
        keyPrefix: 'lk_abcdef123',
        createdAt: new Date(),
      });

      const result = await service.create({ name: 'Minha API' }, MOCK_USER_ID);

      expect(result.key).toMatch(/^lk_/);
      expect(result.name).toBe('Minha API');
      expect(result.message).toContain('Guarde esta chave');
      expect(mockPrisma.apiKey.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('retorna apenas as chaves do usuário para role USER', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      await service.findAll(MOCK_USER_ID, 'USER');

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: MOCK_USER_ID } }),
      );
    });

    it('retorna todas as chaves para role ADMIN', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      await service.findAll(MOCK_USER_ID, 'ADMIN');

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('revoke', () => {
    it('revoga a própria chave', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: MOCK_KEY_ID,
        userId: MOCK_USER_ID,
        isActive: true,
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      await service.revoke(MOCK_KEY_ID, MOCK_USER_ID, 'USER');

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: MOCK_KEY_ID },
        data: { isActive: false },
      });
    });

    it('admin pode revogar chave de outro usuário', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: MOCK_KEY_ID,
        userId: 'outro-user',
        isActive: true,
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      await service.revoke(MOCK_KEY_ID, MOCK_USER_ID, 'ADMIN');

      expect(mockPrisma.apiKey.update).toHaveBeenCalledTimes(1);
    });

    it('lança ForbiddenException ao revogar chave de outro usuário', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: MOCK_KEY_ID,
        userId: 'outro-user',
        isActive: true,
      });

      await expect(service.revoke(MOCK_KEY_ID, MOCK_USER_ID, 'USER')).rejects.toThrow(ForbiddenException);
    });

    it('lança NotFoundException para chave inexistente', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(service.revoke('nao-existe', MOCK_USER_ID, 'USER')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deleta a própria chave', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({ id: MOCK_KEY_ID, userId: MOCK_USER_ID });
      mockPrisma.apiKey.delete.mockResolvedValue({});

      await service.delete(MOCK_KEY_ID, MOCK_USER_ID, 'USER');

      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: MOCK_KEY_ID } });
    });

    it('lança ForbiddenException ao deletar chave de outro usuário', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({ id: MOCK_KEY_ID, userId: 'outro-user' });

      await expect(service.delete(MOCK_KEY_ID, MOCK_USER_ID, 'USER')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validate', () => {
    it('retorna null para chaves sem prefixo lk_', async () => {
      const result = await service.validate('invalid-key');
      expect(result).toBeNull();
    });

    it('valida chave correta e retorna userId', async () => {
      const rawKey = 'lk_' + 'a'.repeat(64);
      const keyHash = await argon2.hash(rawKey);

      mockPrisma.apiKey.findMany.mockResolvedValue([{
        id: MOCK_KEY_ID,
        keyHash,
        userId: MOCK_USER_ID,
        keyPrefix: rawKey.slice(0, 10),
      }]);
      mockPrisma.apiKey.update.mockResolvedValue({});

      const result = await service.validate(rawKey);

      expect(result).not.toBeNull();
      expect(result?.userId).toBe(MOCK_USER_ID);
      expect(result?.keyId).toBe(MOCK_KEY_ID);
    });

    it('retorna null para chave inválida', async () => {
      const rawKey = 'lk_' + 'a'.repeat(64);
      const keyHash = await argon2.hash('lk_' + 'b'.repeat(64));

      mockPrisma.apiKey.findMany.mockResolvedValue([{
        id: MOCK_KEY_ID,
        keyHash,
        userId: MOCK_USER_ID,
        keyPrefix: rawKey.slice(0, 10),
      }]);

      const result = await service.validate(rawKey);

      expect(result).toBeNull();
    });
  });
});

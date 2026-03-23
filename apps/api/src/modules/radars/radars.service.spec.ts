import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RadarsService } from './radars.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN } from '../rag/providers/ai-provider.interface';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  radar: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  radarAlert: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  jurisprudenceDocument: {
    findUnique: jest.fn(),
  },
  $executeRawUnsafe: jest.fn(),
  $queryRawUnsafe: jest.fn(),
};

const mockAIProvider = {
  generateEmbedding: jest.fn().mockResolvedValue({ embedding: new Array(1536).fill(0.1), tokenCount: 10 }),
  generateChatCompletion: jest.fn(),
};

const mockNotificationsService = {
  createForUser: jest.fn().mockResolvedValue(undefined),
};

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_RADAR_ID = 'radar-uuid-1';

describe('RadarsService', () => {
  let service: RadarsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        RadarsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AI_PROVIDER_TOKEN, useValue: mockAIProvider },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get(RadarsService);
  });

  describe('create', () => {
    it('deve criar radar e gerar embedding da tese', async () => {
      const dto = { title: 'Dano Moral', thesisText: 'negativação indevida', threshold: 0.85 };
      mockPrisma.radar.create.mockResolvedValue({ id: MOCK_RADAR_ID, ...dto });
      mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);

      const result = await service.create(dto, MOCK_USER_ID);

      expect(mockAIProvider.generateEmbedding).toHaveBeenCalledWith(dto.thesisText);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalled();
      expect(result.id).toBe(MOCK_RADAR_ID);
    });
  });

  describe('list', () => {
    it('deve retornar radares do usuário', async () => {
      mockPrisma.radar.findMany.mockResolvedValue([{ id: MOCK_RADAR_ID }]);
      const result = await service.list(MOCK_USER_ID);
      expect(mockPrisma.radar.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: MOCK_USER_ID },
      }));
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.update(MOCK_RADAR_ID, {}, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve regenerar embedding se thesisText mudou', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: MOCK_USER_ID });
      mockPrisma.radar.update.mockResolvedValue({ id: MOCK_RADAR_ID });
      mockPrisma.$executeRawUnsafe.mockResolvedValue(undefined);

      await service.update(MOCK_RADAR_ID, { thesisText: 'nova tese' }, MOCK_USER_ID);

      expect(mockAIProvider.generateEmbedding).toHaveBeenCalledWith('nova tese');
    });
  });

  describe('remove', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.remove(MOCK_RADAR_ID, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUnreadCount', () => {
    it('deve retornar contagem de alertas não lidos do usuário', async () => {
      mockPrisma.radarAlert.count.mockResolvedValue(3);
      const count = await service.getUnreadCount(MOCK_USER_ID);
      expect(count).toBe(3);
      expect(mockPrisma.radarAlert.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ readAt: null }) }),
      );
    });
  });
});

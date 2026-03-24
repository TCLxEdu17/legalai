import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RadarsService } from './radars.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER_TOKEN } from '../rag/providers/ai-provider.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { RadarEmailService } from './radar-email.service';

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
  $executeRaw: jest.fn(),
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

const mockRadarEmailService = {
  sendAlert: jest.fn().mockResolvedValue(undefined),
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
        { provide: RadarEmailService, useValue: mockRadarEmailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string, def?: string) => def ?? '') },
        },
      ],
    }).compile();
    service = module.get(RadarsService);
  });

  describe('create', () => {
    it('deve criar radar e gerar embedding da tese', async () => {
      const dto = { title: 'Dano Moral', thesisText: 'negativação indevida', threshold: 0.85 };
      mockPrisma.radar.create.mockResolvedValue({ id: MOCK_RADAR_ID, ...dto });
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      const result = await service.create(dto, MOCK_USER_ID);

      expect(mockAIProvider.generateEmbedding).toHaveBeenCalledWith(dto.thesisText);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
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

  describe('findOne', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.findOne(MOCK_RADAR_ID, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException se radar não existe', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue(null);
      await expect(service.findOne(MOCK_RADAR_ID, MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deve retornar radar se pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: MOCK_USER_ID });
      const result = await service.findOne(MOCK_RADAR_ID, MOCK_USER_ID);
      expect(result.id).toBe(MOCK_RADAR_ID);
    });
  });

  describe('update', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.update(MOCK_RADAR_ID, {}, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException se radar não existe', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue(null);
      await expect(service.update(MOCK_RADAR_ID, {}, MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deve regenerar embedding se thesisText mudou', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: MOCK_USER_ID });
      mockPrisma.radar.update.mockResolvedValue({ id: MOCK_RADAR_ID });
      mockPrisma.$executeRaw.mockResolvedValue(undefined);

      await service.update(MOCK_RADAR_ID, { thesisText: 'nova tese' }, MOCK_USER_ID);

      expect(mockAIProvider.generateEmbedding).toHaveBeenCalledWith('nova tese');
    });
  });

  describe('remove', () => {
    it('deve rejeitar se radar não pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: 'other-user' });
      await expect(service.remove(MOCK_RADAR_ID, MOCK_USER_ID)).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException se radar não existe', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue(null);
      await expect(service.remove(MOCK_RADAR_ID, MOCK_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deve deletar radar se pertence ao usuário', async () => {
      mockPrisma.radar.findUnique.mockResolvedValue({ id: MOCK_RADAR_ID, userId: MOCK_USER_ID });
      mockPrisma.radar.delete.mockResolvedValue({});
      await service.remove(MOCK_RADAR_ID, MOCK_USER_ID);
      expect(mockPrisma.radar.delete).toHaveBeenCalledWith({ where: { id: MOCK_RADAR_ID } });
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

  describe('checkDocument', () => {
    const MOCK_DOC_ID = 'doc-uuid-1';

    it('não deve criar alerta se nenhum radar ativo com similaridade suficiente', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await service.checkDocument(MOCK_DOC_ID);
      expect(mockPrisma.radarAlert.create).not.toHaveBeenCalled();
    });

    it('deve criar alerta quando similaridade >= threshold', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          radar_id: MOCK_RADAR_ID,
          max_similarity: 0.91,
          user_id: MOCK_USER_ID,
          user_email: 'user@example.com',
          title: 'Dano Moral',
          threshold: 0.85,
        },
      ]);
      mockPrisma.radarAlert.create.mockResolvedValue({ id: 'alert-1', radarId: MOCK_RADAR_ID });
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      mockAIProvider.generateChatCompletion.mockResolvedValue({
        content: 'Resumo da decisão',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });
      mockPrisma.radarAlert.update.mockResolvedValue({});
      mockPrisma.jurisprudenceDocument.findUnique.mockResolvedValue({
        title: 'Acórdão STJ',
        cleanedText: 'texto da decisão',
        tribunal: 'STJ',
        judgmentDate: new Date(),
      });

      await service.checkDocument(MOCK_DOC_ID);

      expect(mockPrisma.radarAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ radarId: MOCK_RADAR_ID, documentId: MOCK_DOC_ID }),
        }),
      );
      expect(mockNotificationsService.createForUser).toHaveBeenCalledWith(
        MOCK_USER_ID,
        expect.stringContaining('Dano Moral'),
        expect.any(String),
        expect.stringContaining(MOCK_RADAR_ID),
      );
      expect(mockRadarEmailService.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.any(String),
          radarTitle: expect.any(String),
        }),
      );
    });

    it('deve ignorar violação de unique constraint (duplicata) sem lançar erro', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { radar_id: MOCK_RADAR_ID, max_similarity: 0.92, user_id: MOCK_USER_ID, user_email: 'u@e.com', title: 'Dano Moral', threshold: 0.85 },
      ]);
      mockPrisma.radarAlert.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.checkDocument(MOCK_DOC_ID)).resolves.not.toThrow();
    });
  });
});

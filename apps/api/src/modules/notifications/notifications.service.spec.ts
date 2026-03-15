import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

const MOCK_NOTIFICATION = {
  id: 'notif-1',
  userId: 'user-1',
  title: 'Novo documento',
  body: 'Um novo documento foi adicionado',
  link: null,
  read: false,
  createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  describe('createForUser', () => {
    it('cria notificação para usuário específico', async () => {
      mockPrisma.notification.create.mockResolvedValue(MOCK_NOTIFICATION);

      await service.createForUser('user-1', 'Novo documento', 'Um novo documento foi adicionado');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'user-1', title: 'Novo documento' }),
      });
    });

    it('cria notificação com link opcional', async () => {
      mockPrisma.notification.create.mockResolvedValue({ ...MOCK_NOTIFICATION, link: '/docs/1' });

      await service.createForUser('user-1', 'Título', 'Corpo', '/docs/1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ link: '/docs/1' }),
      });
    });
  });

  describe('createForAllUsers', () => {
    it('cria notificação para todos usuários ativos', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 2 });

      await service.createForAllUsers('Sistema', 'Manutenção programada');

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1' }),
          expect.objectContaining({ userId: 'user-2' }),
        ]),
      });
    });

    it('não cria notificações quando não há usuários ativos', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.notification.createMany.mockResolvedValue({ count: 0 });

      await service.createForAllUsers('Sistema', 'Manutenção programada');

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({ data: [] });
    });
  });

  describe('getUserNotifications', () => {
    it('retorna notificações do usuário ordenadas', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([MOCK_NOTIFICATION]);

      const result = await service.getUserNotifications('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('markRead', () => {
    it('marca notificação como lida', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markRead('user-1', 'notif-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { read: true },
      });
    });
  });

  describe('markAllRead', () => {
    it('marca todas notificações do usuário como lidas', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { read: true },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('retorna contagem de notificações não lidas', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(3);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
      });
    });

    it('retorna zero quando não há notificações não lidas', async () => {
      mockPrisma.notification.count.mockResolvedValue(0);

      const count = await service.getUnreadCount('user-1');

      expect(count).toBe(0);
    });
  });
});

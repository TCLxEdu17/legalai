import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, title: string, body: string, link?: string) {
    await this.prisma.notification.create({ data: { userId, title, body, link } });
  }

  async createForAllUsers(title: string, body: string, link?: string) {
    const users = await this.prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
    await this.prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, title, body, link })),
    });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId }, data: { read: true } });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }
}

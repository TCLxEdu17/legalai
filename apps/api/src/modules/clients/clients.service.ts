import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, search?: string) {
    return this.prisma.client.findMany({
      where: {
        userId,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { cpfCnpj: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, userId } });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  async create(userId: string, data: any) {
    return this.prisma.client.create({ data: { userId, ...data } });
  }

  async update(userId: string, id: string, data: any) {
    await this.findOne(userId, id);
    return this.prisma.client.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.client.delete({ where: { id } });
  }
}

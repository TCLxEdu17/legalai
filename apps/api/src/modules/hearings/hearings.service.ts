import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HearingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.hearing.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const hearing = await this.prisma.hearing.findFirst({ where: { id, userId } });
    if (!hearing) throw new NotFoundException('Audiência não encontrada');
    return hearing;
  }

  async create(userId: string, data: {
    title: string;
    client?: string;
    processNumber?: string;
    court?: string;
    date: string;
    location?: string;
    notes?: string;
  }) {
    return this.prisma.hearing.create({
      data: { userId, ...data, date: new Date(data.date) },
    });
  }

  async update(userId: string, id: string, data: Partial<{
    title: string;
    client: string;
    processNumber: string;
    court: string;
    date: string;
    location: string;
    notes: string;
  }>) {
    await this.findOne(userId, id);
    return this.prisma.hearing.update({
      where: { id },
      data: { ...data, date: data.date ? new Date(data.date) : undefined },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.hearing.delete({ where: { id } });
  }
}

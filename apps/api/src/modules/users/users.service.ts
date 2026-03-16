import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  name?: string;
  isActive?: boolean;
  prefix?: string;
  oabNumber?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { uploadedDocuments: true, chatSessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        prefix: true,
        oabNumber: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { uploadedDocuments: true, chatSessions: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        role: dto.role || UserRole.USER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    this.logger.log(`Usuário criado: ${user.email}`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        prefix: true,
        oabNumber: true,
        updatedAt: true,
      },
    });
  }

  async getPlanInfo(userId: string) {
    const PLAN_LIMITS: Record<string, { chatMessages: number; uploads: number; apiCalls: number }> = {
      trial: { chatMessages: 20, uploads: 3, apiCalls: 50 },
      basic: { chatMessages: 200, uploads: 20, apiCalls: 500 },
      pro: { chatMessages: 2000, uploads: 200, apiCalls: 5000 },
      unlimited: { chatMessages: Infinity, uploads: Infinity, apiCalls: Infinity },
    };

    const user = await this.findById(userId);
    const plan = (user as any).plan || 'trial';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS['trial'];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [chatMessages, uploads, apiCalls] = await Promise.all([
      this.prisma.chatMessage.count({
        where: { session: { userId }, role: 'USER', createdAt: { gte: startOfMonth } },
      }),
      this.prisma.jurisprudenceDocument.count({
        where: { createdById: userId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.usageLog.count({
        where: { userId, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      plan,
      limits: {
        chatMessages: limits.chatMessages === Infinity ? null : limits.chatMessages,
        uploads: limits.uploads === Infinity ? null : limits.uploads,
        apiCalls: limits.apiCalls === Infinity ? null : limits.apiCalls,
      },
      usage: { chatMessages, uploads, apiCalls },
    };
  }

  async getNotes(userId: string): Promise<{ notes: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notes: true },
    });
    if (!user) throw new NotFoundException(`Usuário ${userId} não encontrado`);
    return { notes: user.notes ?? '' };
  }

  async saveNotes(userId: string, notes: string): Promise<{ notes: string }> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { notes },
      select: { notes: true },
    });
    return { notes: updated.notes ?? '' };
  }

  async deleteAccount(id: string) {
    await this.findById(id);

    // Cascata manual: mensagens → sessões → api keys → refresh tokens → usuário
    await this.prisma.$transaction([
      this.prisma.chatMessage.deleteMany({
        where: { session: { userId: id } },
      }),
      this.prisma.chatSession.deleteMany({ where: { userId: id } }),
      this.prisma.apiKey.deleteMany({ where: { userId: id } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    this.logger.log(`Conta excluída (LGPD): userId=${id}`);
  }
}

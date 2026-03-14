import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prioridade, StatusTarefa } from '@prisma/client';

export interface CreateTarefaDto {
  titulo: string;
  descricao?: string;
  caseId?: string;
  prazo?: string;
  prioridade?: 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
}

export interface TarefaLocalResult {
  titulo: string;
  descricao?: string;
  caseId?: string;
  prazo?: string;
  prioridade: string;
  status: 'PENDENTE';
}

@Injectable()
export class TarefasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pure function — used in tests and for local calculation */
  createTarefaLocal(dto: CreateTarefaDto): TarefaLocalResult {
    return {
      titulo: dto.titulo,
      descricao: dto.descricao,
      caseId: dto.caseId,
      prazo: dto.prazo,
      prioridade: dto.prioridade || 'MEDIA',
      status: 'PENDENTE',
    };
  }

  /** Returns tarefas where prazo < now and status is PENDENTE or EM_ANDAMENTO */
  filterTarefasVencendo(
    tarefas: Array<{ prazo: Date | null; status: string; [key: string]: any }>,
  ): typeof tarefas {
    const now = new Date();
    return tarefas.filter(
      (t) =>
        t.prazo &&
        t.prazo < now &&
        (t.status === 'PENDENTE' || t.status === 'EM_ANDAMENTO'),
    );
  }

  async getTarefas(userId: string, params?: {
    caseId?: string;
    status?: StatusTarefa;
    prioridade?: Prioridade;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, caseId, status, prioridade } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (caseId) where.caseId = caseId;
    if (status) where.status = status;
    if (prioridade) where.prioridade = prioridade;

    const [items, total] = await Promise.all([
      this.prisma.tarefa.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ prazo: 'asc' }, { prioridade: 'desc' }],
        include: { case: { select: { id: true, title: true } } },
      }),
      this.prisma.tarefa.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async createTarefa(userId: string, dto: CreateTarefaDto) {
    return this.prisma.tarefa.create({
      data: {
        userId,
        titulo: dto.titulo,
        descricao: dto.descricao,
        caseId: dto.caseId,
        prazo: dto.prazo ? new Date(dto.prazo) : undefined,
        prioridade: (dto.prioridade as Prioridade) || 'MEDIA',
      },
    });
  }

  async updateTarefa(id: string, userId: string, dto: Partial<{
    titulo: string;
    descricao: string;
    prazo: string;
    prioridade: string;
    status: string;
    concluidaEm: string;
  }>) {
    return this.prisma.tarefa.updateMany({
      where: { id, userId },
      data: {
        ...(dto.titulo ? { titulo: dto.titulo } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.prazo ? { prazo: new Date(dto.prazo) } : {}),
        ...(dto.prioridade ? { prioridade: dto.prioridade as Prioridade } : {}),
        ...(dto.status ? { status: dto.status as StatusTarefa } : {}),
        ...(dto.concluidaEm ? { concluidaEm: new Date(dto.concluidaEm) } : {}),
      },
    });
  }

  async deleteTarefa(id: string, userId: string) {
    return this.prisma.tarefa.deleteMany({ where: { id, userId } });
  }

  async getVencendo(userId: string) {
    const now = new Date();
    return this.prisma.tarefa.findMany({
      where: {
        userId,
        prazo: { lt: now },
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      },
      orderBy: { prazo: 'asc' },
      include: { case: { select: { id: true, title: true } } },
    });
  }
}

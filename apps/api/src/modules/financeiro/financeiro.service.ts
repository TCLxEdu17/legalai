import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface FluxoCaixaItem {
  tipo: 'entrada' | 'saida';
  valor: number;
}

export interface FluxoCaixaResult {
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface LancarCobrancaDto {
  clienteId: string;
  valor: number;
  vencimento: string;
  descricao: string;
  caseId?: string;
  categoria?: string;
}

export interface CobrancaResult {
  clienteId: string;
  valor: number;
  vencimento: string;
  descricao: string;
  status: 'pendente';
  createdAt: string;
}

@Injectable()
export class FinanceiroService {
  constructor(private readonly prisma: PrismaService) {}

  calcularFluxoCaixa(items: FluxoCaixaItem[]): FluxoCaixaResult {
    const entradas = items
      .filter((i) => i.tipo === 'entrada')
      .reduce((sum, i) => sum + i.valor, 0);
    const saidas = items
      .filter((i) => i.tipo === 'saida')
      .reduce((sum, i) => sum + i.valor, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }

  lancarCobranca(dto: LancarCobrancaDto): CobrancaResult {
    return {
      clienteId: dto.clienteId,
      valor: dto.valor,
      vencimento: dto.vencimento,
      descricao: dto.descricao,
      status: 'pendente',
      createdAt: new Date().toISOString(),
    };
  }

  async getLancamentos(userId: string, params?: {
    tipo?: 'ENTRADA' | 'SAIDA';
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20, tipo, status } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.lancamentoFinanceiro.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lancamentoFinanceiro.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getResumoMes(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const lancamentos = await this.prisma.lancamentoFinanceiro.findMany({
      where: {
        userId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const fluxo = this.calcularFluxoCaixa(
      lancamentos.map((l) => ({ tipo: l.tipo === 'ENTRADA' ? 'entrada' : 'saida', valor: l.valor })),
    );

    const inadimplentes = lancamentos.filter(
      (l) => l.tipo === 'ENTRADA' && l.status === 'VENCIDO',
    );
    const inadimplencia = inadimplentes.reduce((sum, l) => sum + l.valor, 0);

    return { ...fluxo, inadimplencia };
  }

  async createLancamento(userId: string, dto: {
    tipo: 'ENTRADA' | 'SAIDA';
    valor: number;
    descricao: string;
    clienteId?: string;
    caseId?: string;
    vencimento?: string;
    categoria?: string;
  }) {
    return this.prisma.lancamentoFinanceiro.create({
      data: {
        userId,
        tipo: dto.tipo,
        valor: dto.valor,
        descricao: dto.descricao,
        clienteId: dto.clienteId,
        caseId: dto.caseId,
        vencimento: dto.vencimento ? new Date(dto.vencimento) : undefined,
        categoria: dto.categoria,
      },
    });
  }

  async updateLancamento(id: string, userId: string, dto: Partial<{
    status: string;
    pagoEm: string;
    descricao: string;
    valor: number;
  }>) {
    return this.prisma.lancamentoFinanceiro.updateMany({
      where: { id, userId },
      data: {
        ...(dto.status ? { status: dto.status as any } : {}),
        ...(dto.pagoEm ? { pagoEm: new Date(dto.pagoEm) } : {}),
        ...(dto.descricao ? { descricao: dto.descricao } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
      },
    });
  }

  async deleteLancamento(id: string, userId: string) {
    return this.prisma.lancamentoFinanceiro.deleteMany({
      where: { id, userId },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';

// Chave pública do DataJud (CNJ) — disponível na documentação oficial
const DATAJUD_API_KEY =
  'APIKey cDZHYzlZa0JadVREZDJCendFbzV3cG1BR09yRnE6SkJlTzNjLV9TRENyQWpaS3FUSEZPUw==';
const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br';

// Mapeamento J.TT → índice DataJud
const TRIBUNAL_MAP: Record<string, string> = {
  // Estaduais (J=8)
  '8.01': 'tjac', '8.02': 'tjal', '8.03': 'tjap', '8.04': 'tjam',
  '8.05': 'tjba', '8.06': 'tjce', '8.07': 'tjdft', '8.08': 'tjes',
  '8.09': 'tjgo', '8.10': 'tjma', '8.11': 'tjmt', '8.12': 'tjms',
  '8.13': 'tjmg', '8.14': 'tjpa', '8.15': 'tjpb', '8.16': 'tjpr',
  '8.17': 'tjpe', '8.18': 'tjpi', '8.19': 'tjrj', '8.20': 'tjrn',
  '8.21': 'tjrs', '8.22': 'tjro', '8.23': 'tjrr', '8.24': 'tjsc',
  '8.25': 'tjse', '8.26': 'tjsp', '8.27': 'tjto',
  // Federais (J=5)
  '5.01': 'trf1', '5.02': 'trf2', '5.03': 'trf3', '5.04': 'trf4',
  '5.05': 'trf5', '5.06': 'trf6',
  // Trabalhistas (J=4)
  '4.01': 'trt1', '4.02': 'trt2', '4.03': 'trt3', '4.04': 'trt4',
  '4.05': 'trt5', '4.06': 'trt6', '4.07': 'trt7', '4.08': 'trt8',
  '4.09': 'trt9', '4.10': 'trt10', '4.11': 'trt11', '4.12': 'trt12',
  '4.13': 'trt13', '4.14': 'trt14', '4.15': 'trt15', '4.16': 'trt16',
  '4.17': 'trt17', '4.18': 'trt18', '4.19': 'trt19', '4.20': 'trt20',
  '4.21': 'trt21', '4.22': 'trt22', '4.23': 'trt23', '4.24': 'trt24',
  // STJ, STF, TST, TSE, STM (J=3,1,2,6,7)
  '3.00': 'stj', '1.00': 'stf', '2.00': 'tst', '6.00': 'tse', '7.00': 'stm',
};

const CNJ_REGEX = /^(\d{7})-(\d{2})\.(\d{4})\.(\d{1})\.(\d{2})\.(\d{4})$/;

export interface ProcessoParty {
  name: string;
  type: string;
  lawyers: string[];
}

export interface ProcessoMovement {
  date: string;
  code: number;
  name: string;
  complemento?: string;
}

export interface ProcessoResult {
  number: string;
  tribunal: string;
  classe: string;
  assuntos: string[];
  dataAjuizamento: string | null;
  orgaoJulgador: string | null;
  grau: string;
  status: string;
  parties: ProcessoParty[];
  movements: ProcessoMovement[];
  source: 'datajud';
}

@Injectable()
export class ProcessosService {
  private readonly logger = new Logger(ProcessosService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getTribunalIndex(cnj: string): string {
    const match = CNJ_REGEX.exec(cnj);
    if (!match) throw new BadRequestException('Número CNJ inválido');

    const j = match[4];   // segmento de justiça
    const tt = match[5];  // tribunal
    const key = `${j}.${parseInt(tt, 10)}`;

    const index = TRIBUNAL_MAP[key];
    if (!index) throw new BadRequestException(`Tribunal não suportado: J=${j} TT=${tt}`);
    return index;
  }

  private normalizeNumber(cnj: string): string {
    // Remove formatting, keep only digits
    return cnj.replace(/\D/g, '');
  }

  async consultar(numeroProcesso: string): Promise<ProcessoResult> {
    const digits = this.normalizeNumber(numeroProcesso);
    if (digits.length !== 20) {
      throw new BadRequestException('Número CNJ deve ter 20 dígitos');
    }

    const formatted = `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits[13]}.${digits.slice(14, 16)}.${digits.slice(16)}`;
    const index = this.getTribunalIndex(formatted);

    const url = `${DATAJUD_BASE}/api_publica_${index}/_search`;

    let response: any;
    try {
      response = await axios.post(
        url,
        {
          query: {
            match: { numeroProcesso: digits },
          },
          size: 1,
        },
        {
          headers: {
            Authorization: DATAJUD_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        },
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) throw new NotFoundException('Processo não encontrado neste tribunal');
      throw new BadRequestException(`Erro ao consultar DataJud: ${err?.message || 'timeout'}`);
    }

    const hits = response.data?.hits?.hits ?? [];
    if (hits.length === 0) {
      throw new NotFoundException('Processo não encontrado. Verifique o número e tente novamente.');
    }

    const doc = hits[0]._source;

    // Normalizar partes
    const parties: ProcessoParty[] = (doc.partes ?? []).map((p: any) => ({
      name: p.nome ?? '',
      type: p.tipo ?? 'Parte',
      lawyers: (p.advogados ?? []).map((a: any) => a.nome ?? ''),
    }));

    // Normalizar movimentos (últimos 20, mais recente primeiro)
    const movements: ProcessoMovement[] = (doc.movimentos ?? [])
      .sort((a: any, b: any) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
      .slice(0, 20)
      .map((m: any) => ({
        date: m.dataHora,
        code: m.codigo,
        name: m.nome ?? m.descricao ?? '',
        complemento: m.complemento ?? undefined,
      }));

    // Status a partir do último movimento
    const lastMov = movements[0]?.name ?? 'Em andamento';

    return {
      number: formatted,
      tribunal: doc.tribunal ?? index.toUpperCase(),
      classe: doc.classe?.nome ?? '',
      assuntos: (doc.assuntos ?? []).map((a: any) => a.nome ?? a),
      dataAjuizamento: doc.dataAjuizamento ?? null,
      orgaoJulgador: doc.orgaoJulgador?.nome ?? null,
      grau: doc.grau ?? '',
      status: lastMov,
      parties,
      movements,
      source: 'datajud',
    };
  }

  async saveProcess(userId: string, dto: { number: string; title?: string; area?: string }) {
    const formatted = dto.number.replace(/\D/g, '');
    if (formatted.length !== 20) throw new BadRequestException('Número CNJ deve ter 20 dígitos');
    const cnj = `${formatted.slice(0, 7)}-${formatted.slice(7, 9)}.${formatted.slice(9, 13)}.${formatted[13]}.${formatted.slice(14, 16)}.${formatted.slice(16)}`;

    return this.prisma.savedProcess.upsert({
      where: { userId_number: { userId, number: cnj } },
      create: { userId, number: cnj, title: dto.title, area: dto.area },
      update: { title: dto.title, area: dto.area, checkEnabled: true },
    });
  }

  async listSavedProcesses(userId: string) {
    return this.prisma.savedProcess.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSavedProcess(userId: string, id: string) {
    const sp = await this.prisma.savedProcess.findFirst({ where: { id, userId } });
    if (!sp) throw new NotFoundException('Processo não encontrado');
    await this.prisma.savedProcess.delete({ where: { id } });
  }

  async checkAndNotify(notificationsService: { createForUser: (userId: string, title: string, body: string, link?: string) => Promise<void> }) {
    const processes = await this.prisma.savedProcess.findMany({ where: { checkEnabled: true } });
    this.logger.log(`Verificando ${processes.length} processos monitorados...`);

    for (const sp of processes) {
      try {
        const result = await this.consultar(sp.number);
        const latestMov = result.movements[0];
        if (!latestMov) continue;

        const latestDate = new Date(latestMov.date);
        if (sp.lastMovementDate && latestDate <= sp.lastMovementDate) continue;

        // Nova movimentação detectada
        await this.prisma.savedProcess.update({
          where: { id: sp.id },
          data: { lastMovementDate: latestDate, lastStatus: latestMov.name },
        });

        await notificationsService.createForUser(
          sp.userId,
          `Nova movimentação: ${sp.title || sp.number}`,
          latestMov.name,
          `/dashboard/processos?q=${encodeURIComponent(sp.number)}`,
        );
        this.logger.log(`Notificação enviada para processo ${sp.number}`);
      } catch (err) {
        this.logger.warn(`Erro ao verificar processo ${sp.number}: ${(err as Error).message}`);
      }
    }
  }
}

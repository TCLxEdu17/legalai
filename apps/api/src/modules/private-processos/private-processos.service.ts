import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OabCredentialsService } from './oab-credentials.service';
import { EsajTjspConnector, ProcessDetails } from './connectors/esaj-tjsp.connector';

const PRO_PLANS = ['pro', 'enterprise'];

@Injectable()
export class PrivateProcessosService {
  private readonly logger = new Logger(PrivateProcessosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oabCredentials: OabCredentialsService,
    private readonly esajConnector: EsajTjspConnector,
  ) {}

  async isPro(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return PRO_PLANS.includes(user?.plan ?? '');
  }

  async queryPrivateProcess(userId: string, numero: string): Promise<ProcessDetails> {
    const pro = await this.isPro(userId);
    if (!pro) {
      throw new ForbiddenException('Consulta de processos privados requer plano PRO');
    }

    const hasCreds = await this.oabCredentials.hasCredentials(userId);
    if (!hasCreds) {
      throw new NotFoundException('Credenciais OAB não configuradas. Configure em Configurações → OAB');
    }

    const creds = await this.oabCredentials.getDecryptedCredentials(userId);
    this.logger.log(`[PrivateProcessos] userId=${userId} consulta ${numero}`);

    const session = await this.esajConnector.login(creds!.oabNumber, creds!.password);
    return this.esajConnector.queryProcess(numero, session);
  }

  async savePrivateProcess(userId: string, numero: string, title?: string): Promise<any> {
    const pro = await this.isPro(userId);
    if (!pro) {
      throw new ForbiddenException('Monitoramento de processos privados requer plano PRO');
    }

    return this.prisma.savedProcess.upsert({
      where: { userId_number: { userId, number: numero } },
      create: { userId, number: numero, title: title ?? null, checkEnabled: true },
      update: { title: title ?? undefined, checkEnabled: true },
    });
  }

  async listSavedPrivateProcesses(userId: string): Promise<any[]> {
    return this.prisma.savedProcess.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeSavedProcess(userId: string, numero: string): Promise<void> {
    await this.prisma.savedProcess.delete({
      where: { userId_number: { userId, number: numero } },
    });
  }
}

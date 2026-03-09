import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestionService } from '../ingestion/ingestion.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly ingestionService: IngestionService,
  ) {}

  /**
   * Ao iniciar o módulo, registra cron jobs para todas as fontes ativas.
   */
  async onModuleInit() {
    this.logger.log('Inicializando scheduler de fontes automáticas...');
    await this.cleanupOrphanedJobs();
    await this.syncCronJobs();
    this.registerPurgeJob();
    this.registerKnowledgeConsolidationJob();
  }

  /** Ao reiniciar, resolve jobs órfãos em RUNNING (processo morreu mid-run). */
  private async cleanupOrphanedJobs() {
    const count = await this.ingestionService.cleanupOrphanedJobs();
    if (count > 0) {
      this.logger.warn(`[Startup] ${count} jobs órfãos em RUNNING resolvidos`);
    }
  }

  /**
   * Sincroniza todos os cron jobs com as fontes ativas no banco.
   * Deve ser chamado sempre que uma fonte for criada, atualizada ou desativada.
   */
  async syncCronJobs() {
    // Remover todos os cron jobs existentes
    const existingJobs = this.schedulerRegistry.getCronJobs();
    existingJobs.forEach((_, name) => {
      if (name.startsWith('source_')) {
        this.schedulerRegistry.deleteCronJob(name);
      }
    });

    // Registrar fontes ativas
    const activeSources = await this.prisma.externalSource.findMany({
      where: { isActive: true },
    });

    for (const source of activeSources) {
      await this.registerSourceJob(source.id, source.name, source.scheduleCron);
    }

    this.logger.log(`${activeSources.length} cron jobs registrados`);
  }

  async registerSourceJob(sourceId: string, sourceName: string, cronExpression: string) {
    const jobName = `source_${sourceId}`;

    try {
      const job = new CronJob(cronExpression, async () => {
        this.logger.log(`[CRON] Executando ingestão automática para "${sourceName}"`);
        try {
          const result = await this.ingestionService.runForSource(sourceId, 'AUTOMATIC');
          this.logger.log(
            `[CRON] "${sourceName}" concluído: ${result.itemsIndexed} indexados, ${result.errors.length} erros`,
          );
        } catch (err) {
          this.logger.error(`[CRON] Erro em "${sourceName}": ${err.message}`);
        }
      });

      this.schedulerRegistry.addCronJob(jobName, job);
      job.start();

      this.logger.debug(`Cron job registrado: "${sourceName}" — ${cronExpression}`);
    } catch (err) {
      this.logger.error(`Erro ao registrar cron para "${sourceName}": ${err.message}`);
    }
  }

  /**
   * Job diário de consolidação de conhecimento — roda às 04h.
   * Para cada tema com >= 3 docs, gera uma síntese AI e a indexa na base vetorial.
   * Isso faz o RAG "aprender" com o acúmulo de jurisprudências.
   */
  private registerKnowledgeConsolidationJob() {
    const job = new CronJob('0 4 * * *', async () => {
      this.logger.log('[CONSOLIDAÇÃO] Iniciando consolidação diária de conhecimento...');
      try {
        const result = await this.ingestionService.consolidateKnowledge();
        this.logger.log(
          `[CONSOLIDAÇÃO] Concluída: ${result.themesProcessed} temas processados, ${result.errors.length} erros`,
        );
      } catch (err) {
        this.logger.error(`[CONSOLIDAÇÃO] Erro fatal: ${err.message}`);
      }
    });

    this.schedulerRegistry.addCronJob('knowledge_consolidation', job);
    job.start();
    this.logger.log('Job de consolidação de conhecimento registrado (diário às 04h)');
  }

  /** Purga chats com mais de 90 dias — roda todo dia às 03h (LGPD) */
  private registerPurgeJob() {
    const job = new CronJob('0 3 * * *', async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);

      const sessions = await this.prisma.chatSession.findMany({
        where: { updatedAt: { lt: cutoff } },
        select: { id: true },
      });

      if (sessions.length === 0) return;

      const sessionIds = sessions.map((s) => s.id);

      const { count: msgs } = await this.prisma.chatMessage.deleteMany({
        where: { sessionId: { in: sessionIds } },
      });
      const { count: sess } = await this.prisma.chatSession.deleteMany({
        where: { id: { in: sessionIds } },
      });

      this.logger.log(`[LGPD] Purga: ${sess} sessões e ${msgs} mensagens com +90 dias removidas`);
    });

    this.schedulerRegistry.addCronJob('lgpd_purge', job);
    job.start();
    this.logger.log('Job de purga LGPD registrado (diário às 03h)');
  }

  async removeSourceJob(sourceId: string) {
    const jobName = `source_${sourceId}`;
    try {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.debug(`Cron job removido: ${jobName}`);
    } catch {
      // Job não existia
    }
  }

  getActiveCronJobs(): Array<{ name: string; running: boolean; nextDate: string | null }> {
    const jobs = this.schedulerRegistry.getCronJobs();
    const result: Array<{ name: string; running: boolean; nextDate: string | null }> = [];

    jobs.forEach((job: any, name: string) => {
      if (name.startsWith('source_')) {
        result.push({
          name,
          running: job.running ?? false,
          nextDate: job.nextDate?.()?.toISO?.() ?? null,
        });
      }
    });

    return result;
  }
}

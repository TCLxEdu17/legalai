import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexão com o banco de dados estabelecida');

    // Habilitar pgvector se não estiver habilitado
    await this.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    await this.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexão com o banco de dados encerrada');
  }

  /**
   * Executar operação com retry em caso de falha transiente
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
  ): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === retries) throw error;
        this.logger.warn(`Tentativa ${attempt}/${retries} falhou. Retentando...`);
        await new Promise((r) => setTimeout(r, 100 * attempt));
      }
    }
    throw new Error('Todas as tentativas falharam');
  }
}

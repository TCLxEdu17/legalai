import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { DOCUMENT_PROCESSING_QUEUE } from './queues.constants';

function parseRedisUrl(url: string): { host: string; port: number; password?: string; db?: number } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || '127.0.0.1',
      port: u.port ? parseInt(u.port, 10) : 6379,
      password: u.password || undefined,
      db: u.pathname && u.pathname !== '/' ? parseInt(u.pathname.slice(1), 10) : undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
        const parsed = parseRedisUrl(url);
        return {
          connection: {
            ...parsed,
            family: 4, // força IPv4 — evita ECONNREFUSED em ::1 no macOS
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 200 },
          },
        };
      },
    }),
    BullModule.registerQueue({ name: DOCUMENT_PROCESSING_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

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

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
        const parsed = parseRedisUrl(url);
        const client = new Redis({
          ...parsed,
          family: 4, // força IPv4 — evita ECONNREFUSED em ::1 no macOS
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          lazyConnect: false,
        });
        client.on('error', (err) => {
          if (!err.message.includes('ECONNREFUSED')) {
            console.error('[Redis] erro:', err.message);
          }
        });
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

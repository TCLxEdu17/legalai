import { Injectable, Logger, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { RagQueryResult } from './rag.service';

const TTL_SECONDS = 60 * 60; // 1 hora
const KEY_PREFIX = 'rag:v1:';

@Injectable()
export class RagCacheService {
  private readonly logger = new Logger(RagCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  buildKey(question: string, legalArea?: string): string {
    const raw = `${question.toLowerCase().trim()}|${legalArea ?? ''}`;
    return KEY_PREFIX + createHash('sha256').update(raw).digest('hex');
  }

  async get(question: string, legalArea?: string): Promise<RagQueryResult | null> {
    try {
      const key = this.buildKey(question, legalArea);
      const cached = await this.redis.get(key);
      if (!cached) return null;

      this.logger.debug(`[Cache] HIT ${key.slice(-8)}`);
      return JSON.parse(cached) as RagQueryResult;
    } catch {
      return null; // Cache indisponível → não bloqueia
    }
  }

  async set(question: string, result: RagQueryResult, legalArea?: string): Promise<void> {
    try {
      // Só cacheia respostas com confiança média ou alta para não solidificar respostas ruins
      if (result.confidence === 'none') return;

      const key = this.buildKey(question, legalArea);
      await this.redis.setex(key, TTL_SECONDS, JSON.stringify(result));
      this.logger.debug(`[Cache] SET ${key.slice(-8)} (TTL ${TTL_SECONDS}s)`);
    } catch {
      // Cache indisponível → segue sem cache
    }
  }

  async invalidate(pattern?: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`${KEY_PREFIX}${pattern ?? '*'}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`[Cache] ${keys.length} chaves invalidadas`);
      }
    } catch {
      // silencioso
    }
  }
}

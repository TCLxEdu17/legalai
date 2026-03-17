import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { ChunkingService } from './chunking.service';
import { EmbeddingsService } from './embeddings.service';
import { VectorSearchService } from './vector-search.service';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { AI_PROVIDER_TOKEN } from './providers/ai-provider.interface';
// import { RagCacheService } from './rag-cache.service';  // TODO sexta: reativar com Redis

/**
 * Factory para selecionar o provider de IA baseado na variável AI_PROVIDER.
 * Adicionar novos providers aqui sem alterar o restante do código.
 */
const aiProviderFactory = {
  provide: AI_PROVIDER_TOKEN,
  inject: [ConfigService, OpenAIProvider, AnthropicProvider],
  useFactory: (
    config: ConfigService,
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
  ) => {
    const provider = config.get<string>('app.ai.provider', 'openai');
    if (provider === 'anthropic') {
      return anthropic;
    }
    return openai;
  },
};

@Module({
  controllers: [RagController],
  providers: [
    OpenAIProvider,
    AnthropicProvider,
    aiProviderFactory,
    ChunkingService,
    EmbeddingsService,
    VectorSearchService,
    RagService,
    // RagCacheService,  // TODO sexta: reativar com Redis
  ],
  exports: [RagService, ChunkingService, EmbeddingsService, VectorSearchService, AI_PROVIDER_TOKEN],
})
export class RagModule {}

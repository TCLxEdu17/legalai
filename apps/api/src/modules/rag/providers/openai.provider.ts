import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IAIProvider,
  EmbeddingResult,
  ChatMessage,
  ChatCompletionResult,
} from './ai-provider.interface';

/** Aguarda ms milissegundos */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Determina se o erro merece retry */
function isRetryable(err: any): boolean {
  const status: number = err?.status ?? err?.response?.status ?? 0;
  // 429 = rate limit, 500/502/503/504 = erros transitórios do servidor
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  // Erros de rede
  const code: string = err?.code ?? '';
  return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(code);
}

/** Executa fn com retry exponencial (até maxAttempts tentativas) */
async function withRetry<T>(
  fn: () => Promise<T>,
  logger: Logger,
  label: string,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  let lastErr: any;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      attempt++;

      if (!isRetryable(err) || attempt >= maxAttempts) {
        logger.error(
          `[OpenAI] ${label} falhou definitivamente após ${attempt} tentativa(s): ${err?.message}`,
          err?.stack,
        );
        throw err;
      }

      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000); // 1s, 2s, 4s (max 8s)
      logger.warn(
        `[OpenAI] ${label} erro transitório (status=${err?.status ?? err?.code}) — tentativa ${attempt}/${maxAttempts - 1} em ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastErr;
}

@Injectable()
export class OpenAIProvider implements IAIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  private readonly embeddingModel: string;
  private readonly chatModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('app.ai.openai.apiKey');

    if (!apiKey) {
      this.logger.error('[OpenAI] OPENAI_API_KEY não configurada — chamadas à API vão falhar!');
    }

    this.client = new OpenAI({
      apiKey,
      timeout: 45_000,  // 45s por request
      maxRetries: 0,    // Gerenciamos retry manualmente
    });

    this.embeddingModel = configService.get<string>(
      'app.ai.openai.embeddingModel',
      'text-embedding-3-small',
    );
    this.chatModel = configService.get<string>(
      'app.ai.openai.chatModel',
      'gpt-4o',
    );

    this.logger.log(
      `[OpenAI] Inicializado | chatModel=${this.chatModel} | embeddingModel=${this.embeddingModel}`,
    );
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const cleanText = text.trim().replace(/\n+/g, ' ');

    const response = await withRetry(
      () => this.client.embeddings.create({ model: this.embeddingModel, input: cleanText }),
      this.logger,
      'generateEmbedding',
    );

    return {
      embedding: response.data[0].embedding,
      tokenCount: response.usage.total_tokens,
    };
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const cleanTexts = texts.map((t) => t.trim().replace(/\n+/g, ' '));

    const response = await withRetry(
      () => this.client.embeddings.create({ model: this.embeddingModel, input: cleanTexts }),
      this.logger,
      'generateEmbeddings',
    );

    return response.data.map((_item, i) => ({
      embedding: response.data[i].embedding,
      tokenCount: Math.round(response.usage.total_tokens / cleanTexts.length),
    }));
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatCompletionResult> {
    const response = await withRetry(
      () =>
        this.client.chat.completions.create({
          model: this.chatModel,
          messages: messages as any,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 2048,
        }),
      this.logger,
      'generateChatCompletion',
    );

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new Error('Resposta vazia ou nula do modelo OpenAI');
    }

    return {
      content: choice.message.content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
    };
  }
}

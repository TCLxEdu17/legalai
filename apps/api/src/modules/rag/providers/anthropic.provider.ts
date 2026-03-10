import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  IAIProvider,
  EmbeddingResult,
  ChatMessage,
  ChatCompletionResult,
} from './ai-provider.interface';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isRetryable(err: any): boolean {
  const status: number = err?.status ?? err?.response?.status ?? 0;
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  const code: string = err?.code ?? '';
  return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(code);
}

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
          `[Anthropic] ${label} falhou definitivamente após ${attempt} tentativa(s): ${err?.message}`,
          err?.stack,
        );
        throw err;
      }

      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      logger.warn(
        `[Anthropic] ${label} erro transitório (status=${err?.status ?? err?.code}) — tentativa ${attempt}/${maxAttempts - 1} em ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastErr;
}

/**
 * Provider Anthropic para geração de texto.
 * Nota: Anthropic não oferece API própria de embeddings.
 * Usamos OpenAI para embeddings mesmo quando o chat usa Anthropic.
 */
@Injectable()
export class AnthropicProvider implements IAIProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly anthropicClient: Anthropic;
  private readonly openaiClient: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    const anthropicKey = configService.get<string>('app.ai.anthropic.apiKey');
    const openaiKey = configService.get<string>('app.ai.openai.apiKey');

    if (!anthropicKey) {
      this.logger.error('[Anthropic] ANTHROPIC_API_KEY não configurada — chat vai falhar!');
    }
    if (!openaiKey) {
      this.logger.error('[Anthropic] OPENAI_API_KEY não configurada — embeddings vão falhar!');
    }

    this.anthropicClient = new Anthropic({
      apiKey: anthropicKey,
      timeout: 45_000,
      maxRetries: 0,
    });
    this.openaiClient = new OpenAI({
      apiKey: openaiKey,
      timeout: 45_000,
      maxRetries: 0,
    });
    this.model = configService.get<string>(
      'app.ai.anthropic.model',
      'claude-sonnet-4-6',
    );
    this.embeddingModel = configService.get<string>(
      'app.ai.openai.embeddingModel',
      'text-embedding-3-small',
    );

    this.logger.log(
      `[Anthropic] Inicializado | chatModel=${this.model} | embeddingModel=${this.embeddingModel}`,
    );
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const cleanText = text.trim().replace(/\n+/g, ' ');
    const response = await withRetry(
      () => this.openaiClient.embeddings.create({ model: this.embeddingModel, input: cleanText }),
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
      () => this.openaiClient.embeddings.create({ model: this.embeddingModel, input: cleanTexts }),
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
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    if (userMessages.length === 0) {
      throw new Error('[Anthropic] Nenhuma mensagem de usuário para enviar');
    }

    const response = await withRetry(
      () =>
        this.anthropicClient.messages.create({
          model: this.model,
          max_tokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.3,
          system: systemMessage?.content,
          messages: userMessages,
        }),
      this.logger,
      'generateChatCompletion',
    );

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text' || !textBlock.text) {
      throw new Error('Resposta vazia ou nula do modelo Anthropic');
    }

    return {
      content: textBlock.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}

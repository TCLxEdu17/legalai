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

/**
 * Provider Anthropic para geração de texto.
 * Nota: Anthropic não oferece API própria de embeddings.
 * Usamos OpenAI para embeddings mesmo quando o chat usa Anthropic.
 * Isso é uma decisão arquitetural consciente — embeddings e LLM podem ser providers distintos.
 */
@Injectable()
export class AnthropicProvider implements IAIProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly anthropicClient: Anthropic;
  private readonly openaiClient: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    this.anthropicClient = new Anthropic({
      apiKey: configService.get<string>('app.ai.anthropic.apiKey'),
    });
    this.openaiClient = new OpenAI({
      apiKey: configService.get<string>('app.ai.openai.apiKey'),
    });
    this.model = configService.get<string>(
      'app.ai.anthropic.model',
      'claude-opus-4-6',
    );
    this.embeddingModel = configService.get<string>(
      'app.ai.openai.embeddingModel',
      'text-embedding-3-small',
    );
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const cleanText = text.trim().replace(/\n+/g, ' ');
    const response = await this.openaiClient.embeddings.create({
      model: this.embeddingModel,
      input: cleanText,
    });
    return {
      embedding: response.data[0].embedding,
      tokenCount: response.usage.total_tokens,
    };
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const cleanTexts = texts.map((t) => t.trim().replace(/\n+/g, ' '));
    const response = await this.openaiClient.embeddings.create({
      model: this.embeddingModel,
      input: cleanTexts,
    });
    return response.data.map((item) => ({
      embedding: item.embedding,
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

    const response = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      temperature: options?.temperature ?? 0.3,
      system: systemMessage?.content,
      messages: userMessages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Resposta vazia do modelo Anthropic');
    }

    return {
      content: textBlock.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    };
  }
}

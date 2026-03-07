import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IAIProvider,
  EmbeddingResult,
  ChatMessage,
  ChatCompletionResult,
} from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements IAIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  private readonly embeddingModel: string;
  private readonly chatModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: configService.get<string>('app.ai.openai.apiKey'),
    });
    this.embeddingModel = configService.get<string>(
      'app.ai.openai.embeddingModel',
      'text-embedding-3-small',
    );
    this.chatModel = configService.get<string>(
      'app.ai.openai.chatModel',
      'gpt-4o',
    );
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const cleanText = text.trim().replace(/\n+/g, ' ');

    const response = await this.client.embeddings.create({
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

    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: cleanTexts,
    });

    return response.data.map((item, i) => ({
      embedding: item.embedding,
      tokenCount: Math.round(response.usage.total_tokens / cleanTexts.length),
    }));
  }

  async generateChatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: this.chatModel,
      messages: messages as any,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 2048,
    });

    const choice = response.choices[0];
    if (!choice.message.content) {
      throw new Error('Resposta vazia do modelo');
    }

    return {
      content: choice.message.content,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: response.model,
    };
  }
}

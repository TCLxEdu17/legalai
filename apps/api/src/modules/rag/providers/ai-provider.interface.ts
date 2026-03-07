export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Interface para providers de IA (OpenAI, Anthropic, etc.)
 * Permite trocar o provider sem alterar a lógica de negócio.
 */
export interface IAIProvider {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
  generateChatCompletion(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatCompletionResult>;
}

export const AI_PROVIDER_TOKEN = 'AI_PROVIDER';

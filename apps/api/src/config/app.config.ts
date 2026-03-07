import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'fallback_refresh_secret_change_in_production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
      embeddingModel:
        process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      embeddingDimensions: parseInt(
        process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536',
        10,
      ),
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-6',
    },
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  },

  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
    topK: parseInt(process.env.RAG_TOP_K || '5', 10),
    similarityThreshold: parseFloat(
      process.env.RAG_SIMILARITY_THRESHOLD || '0.30',
    ),
  },
}));

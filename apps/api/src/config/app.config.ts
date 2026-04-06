import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.API_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',

  jwt: {
    secret: process.env.JWT_SECRET ?? (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }
      return 'dev-only-fallback-not-for-production';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    // NOTE: Refresh tokens are UUIDs stored in DB, not JWTs.
    // JWT_REFRESH_SECRET env var is ignored and kept for backward compatibility only.
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
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

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'legalai-uploads',
    publicUrl: process.env.R2_PUBLIC_URL || '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    prices: {
      basic: process.env.STRIPE_BASIC_PRICE_ID || '',
      pro: process.env.STRIPE_PRO_PRICE_ID || '',
      unlimited: process.env.STRIPE_UNLIMITED_PRICE_ID || '',
    },
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  rag: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1500', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '100', 10),
    topK: parseInt(process.env.RAG_TOP_K || '3', 10),
    similarityThreshold: parseFloat(
      process.env.RAG_SIMILARITY_THRESHOLD || '0.30',
    ),
  },
}));

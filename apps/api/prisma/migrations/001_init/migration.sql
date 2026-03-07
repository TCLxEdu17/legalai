-- Migration inicial: cria todas as tabelas e habilita pgvector

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- Users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Refresh tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- Jurisprudence documents
CREATE TABLE "jurisprudence_documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "original_text" TEXT,
    "cleaned_text" TEXT,
    "tribunal" TEXT,
    "process_number" TEXT,
    "relator" TEXT,
    "judgment_date" TIMESTAMPTZ,
    "theme" TEXT,
    "keywords" TEXT[] NOT NULL DEFAULT '{}',
    "upload_status" TEXT NOT NULL DEFAULT 'PENDING',
    "processing_status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "processing_error" TEXT,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "jurisprudence_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "jurisprudence_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id")
        REFERENCES "users"("id")
);

CREATE INDEX "jurisprudence_documents_tribunal_idx" ON "jurisprudence_documents"("tribunal");
CREATE INDEX "jurisprudence_documents_theme_idx" ON "jurisprudence_documents"("theme");
CREATE INDEX "jurisprudence_documents_upload_status_idx" ON "jurisprudence_documents"("upload_status");
CREATE INDEX "jurisprudence_documents_processing_status_idx" ON "jurisprudence_documents"("processing_status");

-- Jurisprudence chunks (com embedding vetorial)
CREATE TABLE "jurisprudence_chunks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(1536),
    "embedding_model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "jurisprudence_chunks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "jurisprudence_chunks_document_id_fkey" FOREIGN KEY ("document_id")
        REFERENCES "jurisprudence_documents"("id") ON DELETE CASCADE
);

CREATE INDEX "jurisprudence_chunks_document_id_idx" ON "jurisprudence_chunks"("document_id");

-- Índice HNSW para busca vetorial eficiente (pgvector)
CREATE INDEX "jurisprudence_chunks_embedding_hnsw_idx"
    ON "jurisprudence_chunks"
    USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Chat sessions
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nova consulta',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- Chat messages
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "session_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB DEFAULT '[]',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id")
        REFERENCES "chat_sessions"("id") ON DELETE CASCADE
);

CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisprudence_documents_updated_at
    BEFORE UPDATE ON "jurisprudence_documents"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON "chat_sessions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

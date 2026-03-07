-- Migration 002: fontes externas, ingestão e API keys

-- Novos enums
ALTER TABLE "jurisprudence_documents"
  ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "source_id" UUID,
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "external_document_id" TEXT,
  ADD COLUMN IF NOT EXISTS "content_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT;

CREATE INDEX IF NOT EXISTS "jurisprudence_documents_source_type_idx"
  ON "jurisprudence_documents"("source_type");

CREATE INDEX IF NOT EXISTS "jurisprudence_documents_content_hash_idx"
  ON "jurisprudence_documents"("content_hash");

-- Fontes externas
CREATE TABLE IF NOT EXISTS "external_sources" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT 'html-list',
    "parser_type" TEXT NOT NULL DEFAULT 'html-list',
    "schedule_cron" TEXT NOT NULL DEFAULT '0 2 * * *',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB NOT NULL DEFAULT '{}',
    "last_run_at" TIMESTAMPTZ,
    "last_success_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "external_sources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "external_sources_is_active_idx" ON "external_sources"("is_active");

CREATE TRIGGER update_external_sources_updated_at
    BEFORE UPDATE ON "external_sources"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Jobs de ingestão
CREATE TABLE IF NOT EXISTS "ingestion_jobs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "source_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "source_id" UUID,
    "trigger_type" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "items_processed" INTEGER NOT NULL DEFAULT 0,
    "items_indexed" INTEGER NOT NULL DEFAULT 0,
    "items_skipped" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "logs_json" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ingestion_jobs_source_id_fkey" FOREIGN KEY ("source_id")
        REFERENCES "external_sources"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ingestion_jobs_status_idx" ON "ingestion_jobs"("status");
CREATE INDEX IF NOT EXISTS "ingestion_jobs_source_id_idx" ON "ingestion_jobs"("source_id");
CREATE INDEX IF NOT EXISTS "ingestion_jobs_created_at_idx" ON "ingestion_jobs"("created_at");

CREATE TRIGGER update_ingestion_jobs_updated_at
    BEFORE UPDATE ON "ingestion_jobs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Itens de ingestão
CREATE TABLE IF NOT EXISTS "ingestion_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "job_id" UUID NOT NULL,
    "external_identifier" TEXT,
    "source_url" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "document_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "ingestion_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ingestion_items_job_id_fkey" FOREIGN KEY ("job_id")
        REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ingestion_items_job_id_idx" ON "ingestion_items"("job_id");
CREATE INDEX IF NOT EXISTS "ingestion_items_status_idx" ON "ingestion_items"("status");

CREATE TRIGGER update_ingestion_items_updated_at
    BEFORE UPDATE ON "ingestion_items"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- API Keys
CREATE TABLE IF NOT EXISTS "api_keys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "api_keys_key_hash_key" UNIQUE ("key_hash"),
    CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "api_keys_user_id_idx" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "api_keys_key_hash_idx" ON "api_keys"("key_hash");

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON "api_keys"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

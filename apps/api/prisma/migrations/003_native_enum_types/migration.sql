-- Converte colunas TEXT para enum types nativos do PostgreSQL
-- Necessário para compatibilidade com Prisma v5
-- Usa blocos DO para ser idempotente (seguro rodar mais de uma vez)

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcessingStatus" AS ENUM ('NOT_STARTED', 'CHUNKING', 'EMBEDDING', 'INDEXED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentSourceType" AS ENUM ('MANUAL', 'AUTOMATIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IngestionJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IngestionTrigger" AS ENUM ('MANUAL', 'AUTOMATIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "IngestionItemStatus" AS ENUM ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Alterar colunas TEXT → enum (idempotente via verificação de tipo atual)
DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='users' AND column_name='role') = 'text' THEN
    ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
    ALTER TABLE users ALTER COLUMN role TYPE "UserRole" USING role::"UserRole";
    ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER'::"UserRole";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='jurisprudence_documents' AND column_name='upload_status') = 'text' THEN
    ALTER TABLE jurisprudence_documents ALTER COLUMN upload_status DROP DEFAULT;
    ALTER TABLE jurisprudence_documents ALTER COLUMN upload_status TYPE "UploadStatus" USING upload_status::"UploadStatus";
    ALTER TABLE jurisprudence_documents ALTER COLUMN upload_status SET DEFAULT 'PENDING'::"UploadStatus";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='jurisprudence_documents' AND column_name='processing_status') = 'text' THEN
    ALTER TABLE jurisprudence_documents ALTER COLUMN processing_status DROP DEFAULT;
    ALTER TABLE jurisprudence_documents ALTER COLUMN processing_status TYPE "ProcessingStatus" USING processing_status::"ProcessingStatus";
    ALTER TABLE jurisprudence_documents ALTER COLUMN processing_status SET DEFAULT 'NOT_STARTED'::"ProcessingStatus";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='jurisprudence_documents' AND column_name='source_type') = 'text' THEN
    ALTER TABLE jurisprudence_documents ALTER COLUMN source_type DROP DEFAULT;
    ALTER TABLE jurisprudence_documents ALTER COLUMN source_type TYPE "DocumentSourceType" USING source_type::"DocumentSourceType";
    ALTER TABLE jurisprudence_documents ALTER COLUMN source_type SET DEFAULT 'MANUAL'::"DocumentSourceType";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='chat_messages' AND column_name='role') = 'text' THEN
    ALTER TABLE chat_messages ALTER COLUMN role TYPE "MessageRole" USING role::"MessageRole";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='ingestion_jobs' AND column_name='status') = 'text' THEN
    ALTER TABLE ingestion_jobs ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE ingestion_jobs ALTER COLUMN status TYPE "IngestionJobStatus" USING status::"IngestionJobStatus";
    ALTER TABLE ingestion_jobs ALTER COLUMN status SET DEFAULT 'PENDING'::"IngestionJobStatus";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='ingestion_jobs' AND column_name='source_type') = 'text' THEN
    ALTER TABLE ingestion_jobs ALTER COLUMN source_type DROP DEFAULT;
    ALTER TABLE ingestion_jobs ALTER COLUMN source_type TYPE "IngestionTrigger" USING source_type::"IngestionTrigger";
    ALTER TABLE ingestion_jobs ALTER COLUMN source_type SET DEFAULT 'MANUAL'::"IngestionTrigger";
  END IF;
END $$;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name='ingestion_items' AND column_name='status') = 'text' THEN
    ALTER TABLE ingestion_items ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE ingestion_items ALTER COLUMN status TYPE "IngestionItemStatus" USING status::"IngestionItemStatus";
    ALTER TABLE ingestion_items ALTER COLUMN status SET DEFAULT 'PENDING'::"IngestionItemStatus";
  END IF;
END $$;

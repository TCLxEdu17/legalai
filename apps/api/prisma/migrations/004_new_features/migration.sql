-- Migration 004: New features — hearings, clients, favorites, notifications, webhooks, document_comments
-- + new columns on users (plan) and api_keys (usage tracking) + summary on jurisprudence_documents
-- All statements are idempotent (safe to re-run)

-- ============================================================
-- NEW ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "TrialFeedback" AS ENUM ('YES', 'NO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- NEW COLUMNS ON EXISTING TABLES
-- ============================================================

-- users.plan
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='plan'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'trial';
  END IF;
END $$;

-- jurisprudence_documents.summary
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='jurisprudence_documents' AND column_name='summary'
  ) THEN
    ALTER TABLE "jurisprudence_documents" ADD COLUMN "summary" TEXT;
  END IF;
END $$;

-- api_keys usage tracking columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='api_keys' AND column_name='total_requests'
  ) THEN
    ALTER TABLE "api_keys"
      ADD COLUMN "total_requests"       INT NOT NULL DEFAULT 0,
      ADD COLUMN "requests_this_month"  INT NOT NULL DEFAULT 0,
      ADD COLUMN "tokens_this_month"    INT NOT NULL DEFAULT 0,
      ADD COLUMN "docs_indexed"         INT NOT NULL DEFAULT 0,
      ADD COLUMN "usage_reset_at"       TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- HEARINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "hearings" (
  "id"             UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"        UUID        NOT NULL,
  "title"          TEXT        NOT NULL,
  "client"         TEXT,
  "process_number" TEXT,
  "court"          TEXT,
  "date"           TIMESTAMPTZ NOT NULL,
  "location"       TEXT,
  "notes"          TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "hearings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hearings_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "hearings_user_id_idx" ON "hearings"("user_id");
CREATE INDEX IF NOT EXISTS "hearings_date_idx"    ON "hearings"("date");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_hearings_updated_at') THEN
    CREATE TRIGGER update_hearings_updated_at
      BEFORE UPDATE ON "hearings"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- CLIENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "clients" (
  "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"    UUID        NOT NULL,
  "name"       TEXT        NOT NULL,
  "email"      TEXT,
  "phone"      TEXT,
  "cpf_cnpj"   TEXT,
  "address"    TEXT,
  "notes"      TEXT,
  "is_active"  BOOLEAN     NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "clients_user_id_idx" ON "clients"("user_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clients_updated_at') THEN
    CREATE TRIGGER update_clients_updated_at
      BEFORE UPDATE ON "clients"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- FAVORITES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "favorites" (
  "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"     UUID        NOT NULL,
  "document_id" UUID        NOT NULL,
  "collection"  TEXT        NOT NULL DEFAULT 'Favoritos',
  "note"        TEXT,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "favorites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "favorites_user_id_document_id_key" UNIQUE ("user_id", "document_id"),
  CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "favorites_document_id_fkey" FOREIGN KEY ("document_id")
    REFERENCES "jurisprudence_documents"("id") ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"    UUID        NOT NULL,
  "title"      TEXT        NOT NULL,
  "body"       TEXT        NOT NULL,
  "read"       BOOLEAN     NOT NULL DEFAULT false,
  "link"       TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_read_idx"    ON "notifications"("read");

-- ============================================================
-- WEBHOOKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "webhooks" (
  "id"         UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"    UUID        NOT NULL,
  "url"        TEXT        NOT NULL,
  "events"     TEXT[]      NOT NULL DEFAULT '{}',
  "secret"     TEXT        NOT NULL,
  "is_active"  BOOLEAN     NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhooks_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "webhooks_user_id_idx" ON "webhooks"("user_id");

-- ============================================================
-- DOCUMENT_COMMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "document_comments" (
  "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "user_id"     UUID        NOT NULL,
  "document_id" UUID        NOT NULL,
  "content"     TEXT        NOT NULL,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_comments_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "document_comments_document_id_fkey" FOREIGN KEY ("document_id")
    REFERENCES "jurisprudence_documents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "document_comments_document_id_idx" ON "document_comments"("document_id");
CREATE INDEX IF NOT EXISTS "document_comments_user_id_idx"     ON "document_comments"("user_id");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_document_comments_updated_at') THEN
    CREATE TRIGGER update_document_comments_updated_at
      BEFORE UPDATE ON "document_comments"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- TRIAL_USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "trial_users" (
  "id"               UUID          NOT NULL DEFAULT uuid_generate_v4(),
  "prefix"           TEXT          NOT NULL,
  "name"             TEXT          NOT NULL,
  "username"         TEXT          NOT NULL,
  "email"            TEXT          NOT NULL,
  "password_hash"    TEXT          NOT NULL,
  "expires_at"       TIMESTAMPTZ   NOT NULL,
  "onboarding_step"  INT           NOT NULL DEFAULT 0,
  "feedback_given"   BOOLEAN       NOT NULL DEFAULT false,
  "feedback"         "TrialFeedback",
  "system_user_id"   UUID,
  "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT "trial_users_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "trial_users_username_key" UNIQUE ("username"),
  CONSTRAINT "trial_users_email_key"    UNIQUE ("email")
);

CREATE INDEX IF NOT EXISTS "trial_users_expires_at_idx" ON "trial_users"("expires_at");

-- ============================================================
-- TRIAL_METRICS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "trial_metrics" (
  "id"            UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "trial_user_id" UUID        NOT NULL,
  "event"         TEXT        NOT NULL,
  "page"          TEXT,
  "element"       TEXT,
  "ip_address"    TEXT,
  "city"          TEXT,
  "region"        TEXT,
  "country"       TEXT        DEFAULT 'BR',
  "user_agent"    TEXT,
  "metadata"      JSONB       NOT NULL DEFAULT '{}',
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "trial_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trial_metrics_trial_user_id_fkey" FOREIGN KEY ("trial_user_id")
    REFERENCES "trial_users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "trial_metrics_trial_user_id_idx" ON "trial_metrics"("trial_user_id");
CREATE INDEX IF NOT EXISTS "trial_metrics_event_idx"          ON "trial_metrics"("event");
CREATE INDEX IF NOT EXISTS "trial_metrics_created_at_idx"     ON "trial_metrics"("created_at");

-- ============================================================
-- USAGE_LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "usage_logs" (
  "id"          UUID        NOT NULL DEFAULT uuid_generate_v4(),
  "api_key_id"  UUID,
  "user_id"     UUID        NOT NULL,
  "endpoint"    TEXT        NOT NULL,
  "method"      TEXT        NOT NULL DEFAULT 'POST',
  "tokens_used" INT         NOT NULL DEFAULT 0,
  "duration_ms" INT         NOT NULL DEFAULT 0,
  "status_code" INT         NOT NULL DEFAULT 200,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "usage_logs_user_id_fkey"    FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE,
  CONSTRAINT "usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "usage_logs_api_key_id_idx" ON "usage_logs"("api_key_id");
CREATE INDEX IF NOT EXISTS "usage_logs_user_id_idx"    ON "usage_logs"("user_id");
CREATE INDEX IF NOT EXISTS "usage_logs_created_at_idx" ON "usage_logs"("created_at");

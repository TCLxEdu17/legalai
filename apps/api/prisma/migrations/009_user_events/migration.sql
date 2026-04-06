-- Migration 009: cria tabela user_events para tracking de usuários reais
-- Idempotente: CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS "user_events" (
    "id"         UUID         NOT NULL DEFAULT uuid_generate_v4(),
    "user_id"    UUID         NOT NULL,
    "event"      TEXT         NOT NULL,
    "page"       TEXT,
    "element"    TEXT,
    "metadata"   JSONB        NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "user_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_events_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_events_user_id_idx"   ON "user_events"("user_id");
CREATE INDEX IF NOT EXISTS "user_events_event_idx"     ON "user_events"("event");
CREATE INDEX IF NOT EXISTS "user_events_created_at_idx" ON "user_events"("created_at");

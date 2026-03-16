-- Migration 008: colunas faltantes na tabela users
-- Idempotente: IF NOT EXISTS em cada bloco

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='prefix'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "prefix" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='oab_number'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "oab_number" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='notes'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "notes" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "tenant_id" UUID;
  END IF;
END $$;

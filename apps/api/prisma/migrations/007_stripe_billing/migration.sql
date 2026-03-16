-- Migration 007: Stripe Billing — adiciona colunas de assinatura na tabela users
-- Idempotente: safe to re-run

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='stripe_customer_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "stripe_customer_id" TEXT UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='stripe_subscription_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "stripe_subscription_id" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='stripe_price_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "stripe_price_id" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='plan_expires_at'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "plan_expires_at" TIMESTAMP(3);
  END IF;
END $$;

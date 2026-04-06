ALTER TABLE "trial_users"
  ADD COLUMN IF NOT EXISTS "contact_email" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Fix for trial_users missing contact_email and phone columns
-- Uses IF NOT EXISTS to be safe if columns already exist
ALTER TABLE "trial_users"
  ADD COLUMN IF NOT EXISTS "contact_email" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT;

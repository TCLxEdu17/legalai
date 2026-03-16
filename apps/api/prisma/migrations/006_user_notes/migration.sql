-- AddColumn: notes to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notes" TEXT;

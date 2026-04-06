-- Create feedback table for user feedback and bug reports
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedbacks_user_id_idx" ON "feedbacks"("user_id");
CREATE INDEX "feedbacks_status_idx" ON "feedbacks"("status");
CREATE INDEX "feedbacks_severity_idx" ON "feedbacks"("severity");

ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

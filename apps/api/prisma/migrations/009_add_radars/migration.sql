-- CreateTable: radars
CREATE TABLE IF NOT EXISTS "radars" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "case_id" UUID,
    "title" TEXT NOT NULL,
    "thesis_text" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radars_pkey" PRIMARY KEY ("id")
);

-- CreateTable: radar_alerts
CREATE TABLE IF NOT EXISTS "radar_alerts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "radar_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "summary" TEXT,
    "impact_analysis" TEXT,
    "notified_by_email" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "radar_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "radars_user_id_idx" ON "radars"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "radars_active_idx" ON "radars"("active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "radar_alerts_radar_id_document_id_key" ON "radar_alerts"("radar_id", "document_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "radar_alerts_radar_id_idx" ON "radar_alerts"("radar_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "radar_alerts_read_at_idx" ON "radar_alerts"("read_at");

-- AddForeignKey
ALTER TABLE "radars" ADD CONSTRAINT "radars_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radars" ADD CONSTRAINT "radars_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radar_alerts" ADD CONSTRAINT "radar_alerts_radar_id_fkey"
    FOREIGN KEY ("radar_id") REFERENCES "radars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radar_alerts" ADD CONSTRAINT "radar_alerts_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "jurisprudence_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add thesis_embedding vector column (pgvector — cannot be expressed in Prisma schema directly)
ALTER TABLE "radars" ADD COLUMN IF NOT EXISTS thesis_embedding vector(1536);

-- HNSW index for cosine similarity search on thesis_embedding
CREATE INDEX IF NOT EXISTS radars_thesis_embedding_hnsw
    ON "radars" USING hnsw (thesis_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

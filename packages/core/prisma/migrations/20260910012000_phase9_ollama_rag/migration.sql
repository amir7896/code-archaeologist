-- Phase 9: investigations with cited evidence. pgvector stays off.

CREATE TYPE "InvestigationStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED'
);

UPDATE "schema_meta" SET "phase" = '9-ollama-rag' WHERE "id" = 'code-archaeologist';

CREATE TABLE "investigations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "status" "InvestigationStatus" NOT NULL DEFAULT 'QUEUED',
    "model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "used_model" BOOLEAN NOT NULL DEFAULT false,
    "subject_file_id" UUID,
    "subject_symbol_id" UUID,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investigations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investigation_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "investigation_id" UUID NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL,
    "citation" TEXT NOT NULL,
    "file_id" UUID,
    "symbol_id" UUID,
    "commit_sha" TEXT,
    "path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_evidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "investigation_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "investigation_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investigation_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "investigations_repo_created_idx" ON "investigations"("repository_id", "created_at");
CREATE INDEX "investigations_user_idx" ON "investigations"("user_id");
CREATE INDEX "investigation_evidence_inv_idx" ON "investigation_evidence"("investigation_id");
CREATE INDEX "investigation_messages_inv_idx" ON "investigation_messages"("investigation_id");

ALTER TABLE "investigations" ADD CONSTRAINT "investigations_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investigations" ADD CONSTRAINT "investigations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investigation_evidence" ADD CONSTRAINT "investigation_evidence_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "investigation_messages" ADD CONSTRAINT "investigation_messages_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "investigations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

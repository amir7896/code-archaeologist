-- Phase 8: commit-to-symbol evidence with confidence. Never stored as certainty.

ALTER TYPE "AnalysisTaskType" ADD VALUE 'LINK_EVIDENCE';

CREATE TYPE "EvidenceKind" AS ENUM (
  'COMMIT_SYMBOL',
  'FILE_COMMIT'
);

CREATE TYPE "EvidenceMethod" AS ENUM (
  'LINE_OVERLAP',
  'FILE_TOUCH',
  'FILE_ADDED',
  'FILE_RENAMED'
);

UPDATE "schema_meta" SET "phase" = '8-historical-evidence' WHERE "id" = 'code-archaeologist';

ALTER TABLE "repositories" ADD COLUMN "last_evidence_revision" TEXT;

CREATE TABLE "evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "method" "EvidenceMethod" NOT NULL,
    "subject_type" "DnaSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "commit_id" UUID,
    "file_id" UUID,
    "symbol_id" UUID,
    "confidence" DOUBLE PRECISION NOT NULL,
    "excerpt" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evidence_unique" ON "evidence"("repository_id", "kind", "subject_id", "source_id");
CREATE INDEX "evidence_subject_idx" ON "evidence"("repository_id", "subject_type", "subject_id");
CREATE INDEX "evidence_commit_idx" ON "evidence"("commit_id");

ALTER TABLE "evidence" ADD CONSTRAINT "evidence_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "commits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phase 6: Code DNA profiles, metrics snapshots, and explainable risk scores.

ALTER TYPE "AnalysisTaskType" ADD VALUE 'COMPUTE_DNA';

CREATE TYPE "DnaSubjectType" AS ENUM (
  'FILE',
  'SYMBOL',
  'MODULE'
);

CREATE TYPE "RiskLevel" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

UPDATE "schema_meta" SET "phase" = '6-code-dna' WHERE "id" = 'code-archaeologist';

ALTER TABLE "repositories" ADD COLUMN "last_dna_revision" TEXT;

CREATE TABLE "symbol_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_id" UUID NOT NULL,
    "qualified_name" TEXT NOT NULL,
    "symbol_id" UUID,
    "commit_id" UUID,
    "revision" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "start_line" INTEGER NOT NULL,
    "end_line" INTEGER NOT NULL,
    "loc" INTEGER NOT NULL DEFAULT 0,
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "nesting" INTEGER NOT NULL DEFAULT 0,
    "change_type" "FileChangeType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symbol_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "symbol_versions_unique" ON "symbol_versions"("file_id", "qualified_name", "revision");
CREATE INDEX "symbol_versions_file_idx" ON "symbol_versions"("file_id");
CREATE INDEX "symbol_versions_symbol_idx" ON "symbol_versions"("symbol_id");
CREATE INDEX "symbol_versions_commit_idx" ON "symbol_versions"("commit_id");

ALTER TABLE "symbol_versions" ADD CONSTRAINT "symbol_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "symbol_versions" ADD CONSTRAINT "symbol_versions_symbol_id_fkey" FOREIGN KEY ("symbol_id") REFERENCES "symbols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "symbol_versions" ADD CONSTRAINT "symbol_versions_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "commits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "metrics_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "revision" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "metrics_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "metrics_snapshots_unique" ON "metrics_snapshots"("repository_id", "revision", "scope", "subject_id");
CREATE INDEX "metrics_snapshots_repo_scope_idx" ON "metrics_snapshots"("repository_id", "scope");

ALTER TABLE "metrics_snapshots" ADD CONSTRAINT "metrics_snapshots_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "risk_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "subject_type" "DnaSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "factors_json" JSONB NOT NULL,
    "evidence_confidence" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "risk_scores_unique" ON "risk_scores"("repository_id", "subject_type", "subject_id");
CREATE INDEX "risk_scores_repo_level_idx" ON "risk_scores"("repository_id", "level");

ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

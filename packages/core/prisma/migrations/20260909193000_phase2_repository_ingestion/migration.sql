-- CreateEnum
CREATE TYPE "RepositoryProvider" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'GENERIC');

-- CreateEnum
CREATE TYPE "RepositoryStatus" AS ENUM ('PENDING', 'SYNCING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('HTTPS_TOKEN');

-- CreateEnum
CREATE TYPE "AnalysisRunType" AS ENUM ('INGESTION');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnalysisTaskType" AS ENUM ('CLONE', 'DETECT_REVISION');

-- CreateEnum
CREATE TYPE "AnalysisTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterTable
UPDATE "schema_meta" SET "phase" = '2-ingestion' WHERE "id" = 'code-archaeologist';

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "provider" "RepositoryProvider" NOT NULL,
    "default_branch" TEXT,
    "current_revision" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" "RepositoryStatus" NOT NULL DEFAULT 'PENDING',
    "last_error" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_credentials" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "encrypted_secret_ref" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "rotated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_runs" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "revision" TEXT,
    "type" "AnalysisRunType" NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_tasks" (
    "id" TEXT NOT NULL,
    "analysis_run_id" TEXT NOT NULL,
    "task_type" "AnalysisTaskType" NOT NULL,
    "status" "AnalysisTaskStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repositories_workspace_id_created_at_idx" ON "repositories"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "repositories_status_idx" ON "repositories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "repository_credentials_repository_id_key" ON "repository_credentials"("repository_id");

-- CreateIndex
CREATE UNIQUE INDEX "repository_credentials_encrypted_secret_ref_key" ON "repository_credentials"("encrypted_secret_ref");

-- CreateIndex
CREATE INDEX "analysis_runs_repository_id_created_at_idx" ON "analysis_runs"("repository_id", "created_at");

-- CreateIndex
CREATE INDEX "analysis_runs_status_idx" ON "analysis_runs"("status");

-- CreateIndex
CREATE INDEX "analysis_tasks_analysis_run_id_idx" ON "analysis_tasks"("analysis_run_id");

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_credentials" ADD CONSTRAINT "repository_credentials_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

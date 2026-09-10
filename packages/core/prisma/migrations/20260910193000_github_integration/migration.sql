-- Phase 9 / checklist 11: workspace GitHub connection, webhooks, reviews, and code links.

UPDATE "schema_meta" SET "phase" = '10-github' WHERE "id" = 'code-archaeologist';

CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISCONNECTED');
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');
CREATE TYPE "ThreadLinkMethod" AS ENUM ('PR_COMMIT', 'PR_FILE', 'REVIEW_PATH', 'TEXT_PATH', 'TEXT_SYMBOL');

ALTER TABLE "repository_threads"
  ADD COLUMN "provider_updated_at" TIMESTAMP(3),
  ADD COLUMN "merge_commit_sha" TEXT,
  ADD COLUMN "head_sha" TEXT;

CREATE TABLE "integrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspace_id" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "account_login" TEXT,
    "account_id" TEXT,
    "encrypted_secret_ref" TEXT NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "webhook_secret_enc" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "sync_requested_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "integrations_encrypted_secret_ref_key" ON "integrations"("encrypted_secret_ref");
CREATE UNIQUE INDEX "integrations_workspace_id_provider_key" ON "integrations"("workspace_id", "provider");
CREATE INDEX "integrations_status_sync_requested_at_idx" ON "integrations"("status", "sync_requested_at");

ALTER TABLE "integrations"
  ADD CONSTRAINT "integrations_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "integration_id" UUID NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "action" TEXT,
    "repository_id" UUID,
    "external_number" INTEGER,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_integration_id_provider_event_id_key" ON "webhook_events"("integration_id", "provider_event_id");
CREATE INDEX "webhook_events_status_received_at_idx" ON "webhook_events"("status", "received_at");

ALTER TABLE "webhook_events"
  ADD CONSTRAINT "webhook_events_integration_id_fkey"
  FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "thread_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "author_login" TEXT,
    "state" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "thread_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "thread_reviews_thread_id_external_id_key" ON "thread_reviews"("thread_id", "external_id");

ALTER TABLE "thread_reviews"
  ADD CONSTRAINT "thread_reviews_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "repository_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "thread_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "author_login" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "path" TEXT,
    "line" INTEGER,
    "submitted_at" TIMESTAMP(3),

    CONSTRAINT "thread_comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "thread_comments_thread_id_external_id_key" ON "thread_comments"("thread_id", "external_id");
CREATE INDEX "thread_comments_thread_id_path_idx" ON "thread_comments"("thread_id", "path");

ALTER TABLE "thread_comments"
  ADD CONSTRAINT "thread_comments_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "repository_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "thread_commits" (
    "thread_id" UUID NOT NULL,
    "sha" TEXT NOT NULL,
    "commit_id" UUID,

    CONSTRAINT "thread_commits_pkey" PRIMARY KEY ("thread_id", "sha")
);

CREATE INDEX "thread_commits_commit_id_idx" ON "thread_commits"("commit_id");

ALTER TABLE "thread_commits"
  ADD CONSTRAINT "thread_commits_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "repository_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "thread_commits"
  ADD CONSTRAINT "thread_commits_commit_id_fkey"
  FOREIGN KEY ("commit_id") REFERENCES "commits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "thread_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "file_id" UUID,
    "symbol_id" UUID,
    "commit_id" UUID,
    "path" TEXT,
    "method" "ThreadLinkMethod" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "excerpt" TEXT,

    CONSTRAINT "thread_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "thread_links_thread_id_method_idx" ON "thread_links"("thread_id", "method");
CREATE INDEX "thread_links_file_id_idx" ON "thread_links"("file_id");

ALTER TABLE "thread_links"
  ADD CONSTRAINT "thread_links_thread_id_fkey"
  FOREIGN KEY ("thread_id") REFERENCES "repository_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Connect-screen options: persist issues/PRs fetched during ingestion.

CREATE TYPE "RepositoryThreadKind" AS ENUM (
  'ISSUE',
  'PULL_REQUEST'
);

CREATE TABLE "repository_threads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "kind" "RepositoryThreadKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "number" INTEGER,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL,
    "author_login" TEXT,
    "url" TEXT,
    "merged_at" TIMESTAMP(3),
    "provider_created_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repository_threads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repository_threads_repository_id_kind_external_id_key" ON "repository_threads"("repository_id", "kind", "external_id");
CREATE INDEX "repository_threads_repository_id_kind_idx" ON "repository_threads"("repository_id", "kind");

ALTER TABLE "repository_threads" ADD CONSTRAINT "repository_threads_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

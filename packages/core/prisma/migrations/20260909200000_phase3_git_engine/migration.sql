-- Phase 3: Git history engine (commits, branches, files, authors).

ALTER TYPE "AnalysisTaskType" ADD VALUE 'INDEX_HISTORY';

CREATE TYPE "FileChangeType" AS ENUM ('ADDED', 'MODIFIED', 'DELETED', 'RENAMED', 'COPIED');

UPDATE "schema_meta" SET "phase" = '3-git-engine' WHERE "id" = 'code-archaeologist';

ALTER TABLE "repositories" ADD COLUMN "last_indexed_revision" TEXT;

CREATE TABLE "developers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "canonical_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "authored_at" TIMESTAMP(3) NOT NULL,
    "committed_at" TIMESTAMP(3) NOT NULL,
    "parent_shas" TEXT[] NOT NULL,
    "is_merge" BOOLEAN NOT NULL DEFAULT false,
    "developer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "head_commit_id" UUID,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "branch_commits" (
    "branch_id" UUID NOT NULL,
    "commit_id" UUID NOT NULL,

    CONSTRAINT "branch_commits_pkey" PRIMARY KEY ("branch_id","commit_id")
);

CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "language" TEXT,
    "hash" TEXT,
    "size" INTEGER,
    "first_revision" TEXT NOT NULL,
    "last_revision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commit_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "commit_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "change_type" "FileChangeType" NOT NULL,
    "old_path" TEXT,
    "new_path" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "similarity" INTEGER,
    "patch_preview" TEXT,

    CONSTRAINT "commit_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "developers_repository_id_canonical_email_key" ON "developers"("repository_id", "canonical_email");
CREATE INDEX "developers_repository_id_idx" ON "developers"("repository_id");

CREATE UNIQUE INDEX "commits_repository_id_sha_key" ON "commits"("repository_id", "sha");
CREATE INDEX "commits_repository_id_committed_at_idx" ON "commits"("repository_id", "committed_at");
CREATE INDEX "commits_developer_id_idx" ON "commits"("developer_id");

CREATE UNIQUE INDEX "branches_repository_id_name_key" ON "branches"("repository_id", "name");
CREATE INDEX "branches_repository_id_idx" ON "branches"("repository_id");

CREATE INDEX "branch_commits_commit_id_idx" ON "branch_commits"("commit_id");

CREATE UNIQUE INDEX "files_repository_id_path_key" ON "files"("repository_id", "path");
CREATE INDEX "files_repository_id_idx" ON "files"("repository_id");

CREATE UNIQUE INDEX "commit_files_commit_id_file_id_key" ON "commit_files"("commit_id", "file_id");
CREATE INDEX "commit_files_file_id_idx" ON "commit_files"("file_id");

ALTER TABLE "developers" ADD CONSTRAINT "developers_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commits" ADD CONSTRAINT "commits_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commits" ADD CONSTRAINT "commits_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "branches" ADD CONSTRAINT "branches_head_commit_id_fkey" FOREIGN KEY ("head_commit_id") REFERENCES "commits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "branch_commits" ADD CONSTRAINT "branch_commits_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_commits" ADD CONSTRAINT "branch_commits_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "commits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commit_files" ADD CONSTRAINT "commit_files_commit_id_fkey" FOREIGN KEY ("commit_id") REFERENCES "commits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commit_files" ADD CONSTRAINT "commit_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

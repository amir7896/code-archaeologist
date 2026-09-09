-- Convert entity ids and foreign keys from CUID text to PostgreSQL UUID.

ALTER TABLE "analysis_tasks" DROP CONSTRAINT "analysis_tasks_analysis_run_id_fkey";
ALTER TABLE "analysis_runs" DROP CONSTRAINT "analysis_runs_repository_id_fkey";
ALTER TABLE "repository_credentials" DROP CONSTRAINT "repository_credentials_repository_id_fkey";
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_workspace_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_workspace_id_fkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey";
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspace_id_fkey";
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_user_id_fkey";
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_id_fkey";

DROP INDEX "workspaces_owner_id_idx";
DROP INDEX "workspace_members_user_id_idx";
DROP INDEX "sessions_user_id_idx";
DROP INDEX "audit_logs_workspace_id_timestamp_idx";
DROP INDEX "audit_logs_user_id_idx";
DROP INDEX "repositories_workspace_id_created_at_idx";
DROP INDEX "repository_credentials_repository_id_key";
DROP INDEX "analysis_runs_repository_id_created_at_idx";
DROP INDEX "analysis_tasks_analysis_run_id_idx";

ALTER TABLE "users" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "workspaces" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "workspaces" ADD COLUMN "owner_id_uuid" UUID;
ALTER TABLE "sessions" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "sessions" ADD COLUMN "user_id_uuid" UUID;
ALTER TABLE "audit_logs" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "audit_logs" ADD COLUMN "workspace_id_uuid" UUID;
ALTER TABLE "audit_logs" ADD COLUMN "user_id_uuid" UUID;
ALTER TABLE "repositories" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "repositories" ADD COLUMN "workspace_id_uuid" UUID;
ALTER TABLE "repository_credentials" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "repository_credentials" ADD COLUMN "repository_id_uuid" UUID;
ALTER TABLE "analysis_runs" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "analysis_runs" ADD COLUMN "repository_id_uuid" UUID;
ALTER TABLE "analysis_tasks" ADD COLUMN "id_uuid" UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "analysis_tasks" ADD COLUMN "analysis_run_id_uuid" UUID;
ALTER TABLE "workspace_members" ADD COLUMN "workspace_id_uuid" UUID;
ALTER TABLE "workspace_members" ADD COLUMN "user_id_uuid" UUID;

UPDATE "workspaces" w
SET "owner_id_uuid" = u."id_uuid"
FROM "users" u
WHERE u."id" = w."owner_id";

UPDATE "workspace_members" m
SET
  "workspace_id_uuid" = w."id_uuid",
  "user_id_uuid" = u."id_uuid"
FROM "workspaces" w, "users" u
WHERE w."id" = m."workspace_id" AND u."id" = m."user_id";

UPDATE "sessions" s
SET "user_id_uuid" = u."id_uuid"
FROM "users" u
WHERE u."id" = s."user_id";

UPDATE "audit_logs" a
SET "workspace_id_uuid" = w."id_uuid"
FROM "workspaces" w
WHERE w."id" = a."workspace_id";

UPDATE "audit_logs" a
SET "user_id_uuid" = u."id_uuid"
FROM "users" u
WHERE u."id" = a."user_id";

UPDATE "repositories" r
SET "workspace_id_uuid" = w."id_uuid"
FROM "workspaces" w
WHERE w."id" = r."workspace_id";

UPDATE "repository_credentials" c
SET "repository_id_uuid" = r."id_uuid"
FROM "repositories" r
WHERE r."id" = c."repository_id";

UPDATE "analysis_runs" ar
SET "repository_id_uuid" = r."id_uuid"
FROM "repositories" r
WHERE r."id" = ar."repository_id";

UPDATE "analysis_tasks" t
SET "analysis_run_id_uuid" = ar."id_uuid"
FROM "analysis_runs" ar
WHERE ar."id" = t."analysis_run_id";

ALTER TABLE "workspaces" ALTER COLUMN "owner_id_uuid" SET NOT NULL;
ALTER TABLE "workspace_members" ALTER COLUMN "workspace_id_uuid" SET NOT NULL;
ALTER TABLE "workspace_members" ALTER COLUMN "user_id_uuid" SET NOT NULL;
ALTER TABLE "sessions" ALTER COLUMN "user_id_uuid" SET NOT NULL;
ALTER TABLE "repositories" ALTER COLUMN "workspace_id_uuid" SET NOT NULL;
ALTER TABLE "repository_credentials" ALTER COLUMN "repository_id_uuid" SET NOT NULL;
ALTER TABLE "analysis_runs" ALTER COLUMN "repository_id_uuid" SET NOT NULL;
ALTER TABLE "analysis_tasks" ALTER COLUMN "analysis_run_id_uuid" SET NOT NULL;

ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_pkey";
ALTER TABLE "users" DROP CONSTRAINT "users_pkey";
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_pkey";
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey";
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey";
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_pkey";
ALTER TABLE "repository_credentials" DROP CONSTRAINT "repository_credentials_pkey";
ALTER TABLE "analysis_runs" DROP CONSTRAINT "analysis_runs_pkey";
ALTER TABLE "analysis_tasks" DROP CONSTRAINT "analysis_tasks_pkey";

ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "users" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "workspaces" DROP COLUMN "id";
ALTER TABLE "workspaces" DROP COLUMN "owner_id";
ALTER TABLE "workspaces" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "workspaces" RENAME COLUMN "owner_id_uuid" TO "owner_id";
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");
ALTER TABLE "workspaces" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "workspace_members" DROP COLUMN "workspace_id";
ALTER TABLE "workspace_members" DROP COLUMN "user_id";
ALTER TABLE "workspace_members" RENAME COLUMN "workspace_id_uuid" TO "workspace_id";
ALTER TABLE "workspace_members" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("workspace_id", "user_id");

ALTER TABLE "sessions" DROP COLUMN "id";
ALTER TABLE "sessions" DROP COLUMN "user_id";
ALTER TABLE "sessions" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "sessions" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");
ALTER TABLE "sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "audit_logs" DROP COLUMN "id";
ALTER TABLE "audit_logs" DROP COLUMN "workspace_id";
ALTER TABLE "audit_logs" DROP COLUMN "user_id";
ALTER TABLE "audit_logs" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "audit_logs" RENAME COLUMN "workspace_id_uuid" TO "workspace_id";
ALTER TABLE "audit_logs" RENAME COLUMN "user_id_uuid" TO "user_id";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "repositories" DROP COLUMN "id";
ALTER TABLE "repositories" DROP COLUMN "workspace_id";
ALTER TABLE "repositories" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "repositories" RENAME COLUMN "workspace_id_uuid" TO "workspace_id";
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_pkey" PRIMARY KEY ("id");
ALTER TABLE "repositories" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "repository_credentials" DROP COLUMN "id";
ALTER TABLE "repository_credentials" DROP COLUMN "repository_id";
ALTER TABLE "repository_credentials" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "repository_credentials" RENAME COLUMN "repository_id_uuid" TO "repository_id";
ALTER TABLE "repository_credentials" ADD CONSTRAINT "repository_credentials_pkey" PRIMARY KEY ("id");
ALTER TABLE "repository_credentials" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "analysis_runs" DROP COLUMN "id";
ALTER TABLE "analysis_runs" DROP COLUMN "repository_id";
ALTER TABLE "analysis_runs" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "analysis_runs" RENAME COLUMN "repository_id_uuid" TO "repository_id";
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_pkey" PRIMARY KEY ("id");
ALTER TABLE "analysis_runs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "analysis_tasks" DROP COLUMN "id";
ALTER TABLE "analysis_tasks" DROP COLUMN "analysis_run_id";
ALTER TABLE "analysis_tasks" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "analysis_tasks" RENAME COLUMN "analysis_run_id_uuid" TO "analysis_run_id";
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_pkey" PRIMARY KEY ("id");
ALTER TABLE "analysis_tasks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "audit_logs_workspace_id_timestamp_idx" ON "audit_logs"("workspace_id", "timestamp");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "repositories_workspace_id_created_at_idx" ON "repositories"("workspace_id", "created_at");
CREATE UNIQUE INDEX "repository_credentials_repository_id_key" ON "repository_credentials"("repository_id");
CREATE INDEX "analysis_runs_repository_id_created_at_idx" ON "analysis_runs"("repository_id", "created_at");
CREATE INDEX "analysis_tasks_analysis_run_id_idx" ON "analysis_tasks"("analysis_run_id");

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repository_credentials" ADD CONSTRAINT "repository_credentials_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "analysis_tasks" ADD CONSTRAINT "analysis_tasks_analysis_run_id_fkey" FOREIGN KEY ("analysis_run_id") REFERENCES "analysis_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

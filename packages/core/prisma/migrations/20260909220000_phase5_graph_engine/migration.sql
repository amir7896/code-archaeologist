-- Phase 5: derived architecture graph from AST symbols and relations.

ALTER TYPE "AnalysisTaskType" ADD VALUE 'BUILD_GRAPH';

CREATE TYPE "GraphNodeType" AS ENUM (
  'FILE',
  'SYMBOL',
  'MODULE'
);

CREATE TYPE "GraphEdgeType" AS ENUM (
  'CONTAINS',
  'IMPORTS',
  'EXPORTS',
  'CALLS',
  'REFERENCES',
  'EXTENDS',
  'IMPLEMENTS',
  'DEPENDS_ON'
);

CREATE TYPE "GraphEvidence" AS ENUM (
  'AST'
);

UPDATE "schema_meta" SET "phase" = '5-graph-engine' WHERE "id" = 'code-archaeologist';

ALTER TABLE "repositories" ADD COLUMN "last_graph_revision" TEXT;

CREATE TABLE "graph_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "repository_id" UUID NOT NULL,
    "source_type" "GraphNodeType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "target_type" "GraphNodeType" NOT NULL,
    "target_id" TEXT,
    "target_key" TEXT NOT NULL,
    "edge_type" "GraphEdgeType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" "GraphEvidence" NOT NULL DEFAULT 'AST',
    "first_revision" TEXT NOT NULL,
    "last_revision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "graph_edges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "graph_edges_unique" ON "graph_edges"("repository_id", "source_type", "source_id", "edge_type", "target_type", "target_key");
CREATE INDEX "graph_edges_repo_type_idx" ON "graph_edges"("repository_id", "edge_type");
CREATE INDEX "graph_edges_source_idx" ON "graph_edges"("source_id");
CREATE INDEX "graph_edges_target_idx" ON "graph_edges"("target_id");

ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

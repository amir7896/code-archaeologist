-- Phase 4: TypeScript/JavaScript AST symbols and relations.

ALTER TYPE "AnalysisTaskType" ADD VALUE 'PARSE_AST';

CREATE TYPE "SymbolKind" AS ENUM (
  'MODULE',
  'CLASS',
  'INTERFACE',
  'ENUM',
  'FUNCTION',
  'METHOD',
  'VARIABLE',
  'CONSTANT',
  'TYPE',
  'NAMESPACE'
);

CREATE TYPE "SymbolRelationType" AS ENUM (
  'IMPORTS',
  'EXPORTS',
  'CALLS',
  'REFERENCES',
  'EXTENDS',
  'IMPLEMENTS'
);

UPDATE "schema_meta" SET "phase" = '4-ast-engine' WHERE "id" = 'code-archaeologist';

ALTER TABLE "repositories" ADD COLUMN "last_parsed_revision" TEXT;
ALTER TABLE "files" ADD COLUMN "loc" INTEGER;
ALTER TABLE "files" ADD COLUMN "complexity" INTEGER;
ALTER TABLE "files" ADD COLUMN "last_parsed_revision" TEXT;

CREATE TABLE "symbols" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_id" UUID NOT NULL,
    "parent_symbol_id" UUID,
    "kind" "SymbolKind" NOT NULL,
    "name" TEXT NOT NULL,
    "qualified_name" TEXT NOT NULL,
    "start_line" INTEGER NOT NULL,
    "end_line" INTEGER NOT NULL,
    "ast_hash" TEXT NOT NULL,
    "loc" INTEGER NOT NULL DEFAULT 0,
    "complexity" INTEGER NOT NULL DEFAULT 0,
    "nesting" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "symbols_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "symbol_relations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_symbol_id" UUID NOT NULL,
    "target_symbol_id" UUID,
    "target_qualified_name" TEXT NOT NULL,
    "type" "SymbolRelationType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symbol_relations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "symbols_file_id_qualified_name_key" ON "symbols"("file_id", "qualified_name");
CREATE INDEX "symbols_file_id_idx" ON "symbols"("file_id");
CREATE INDEX "symbols_qualified_name_idx" ON "symbols"("qualified_name");
CREATE INDEX "symbols_kind_idx" ON "symbols"("kind");

CREATE INDEX "symbol_relations_source_symbol_id_idx" ON "symbol_relations"("source_symbol_id");
CREATE INDEX "symbol_relations_target_symbol_id_idx" ON "symbol_relations"("target_symbol_id");
CREATE INDEX "symbol_relations_type_idx" ON "symbol_relations"("type");

ALTER TABLE "symbols" ADD CONSTRAINT "symbols_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "symbols" ADD CONSTRAINT "symbols_parent_symbol_id_fkey" FOREIGN KEY ("parent_symbol_id") REFERENCES "symbols"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "symbol_relations" ADD CONSTRAINT "symbol_relations_source_symbol_id_fkey" FOREIGN KEY ("source_symbol_id") REFERENCES "symbols"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "symbol_relations" ADD CONSTRAINT "symbol_relations_target_symbol_id_fkey" FOREIGN KEY ("target_symbol_id") REFERENCES "symbols"("id") ON DELETE SET NULL ON UPDATE CASCADE;

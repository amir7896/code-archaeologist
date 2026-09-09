-- CreateTable
CREATE TABLE "schema_meta" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT '0-foundation',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schema_meta_pkey" PRIMARY KEY ("id")
);

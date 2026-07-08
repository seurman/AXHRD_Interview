-- CreateEnum
CREATE TYPE "ConceptNodeKind" AS ENUM (
  'NCS_COMPETENCY',
  'GLOBAL_CLUSTER',
  'GLOBAL_COMPETENCY',
  'GLOBAL_RUBRIC_LEVEL',
  'IRT_QUESTION',
  'GLOBAL_QUESTION',
  'BENCHMARK_REF',
  'ROLE_CONTEXT'
);

-- CreateEnum
CREATE TYPE "ConceptEdgeType" AS ENUM (
  'MEMBER_OF',
  'HAS_LEVEL',
  'PROBES',
  'ALIGNS_WITH',
  'MAPS_TO',
  'CONTEXTUALIZES',
  'SIGNALS',
  'SUPPORTED_BY'
);

-- CreateTable
CREATE TABLE "ConceptRelation" (
    "id" TEXT NOT NULL,
    "edgeType" "ConceptEdgeType" NOT NULL,
    "fromKind" "ConceptNodeKind" NOT NULL,
    "fromKey" TEXT NOT NULL,
    "fromId" TEXT,
    "toKind" "ConceptNodeKind" NOT NULL,
    "toKey" TEXT NOT NULL,
    "toId" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "note" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConceptRelation_fromKind_fromKey_idx" ON "ConceptRelation"("fromKind", "fromKey");

-- CreateIndex
CREATE INDEX "ConceptRelation_toKind_toKey_idx" ON "ConceptRelation"("toKind", "toKey");

-- CreateIndex
CREATE INDEX "ConceptRelation_edgeType_idx" ON "ConceptRelation"("edgeType");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptRelation_edgeType_fromKind_fromKey_toKind_toKey_key" ON "ConceptRelation"("edgeType", "fromKind", "fromKey", "toKind", "toKey");

-- Assessment task CMS: source documents, publish status, Competency/RubricSet FKs,
-- and attempt framework snapshots for reproducible grading.

DO $$ BEGIN
  CREATE TYPE "AssessmentScenarioStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AssessmentTaskSource" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "checksumSha256" TEXT,
  "extractedText" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentTaskSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssessmentTaskSource_createdAt_idx"
  ON "AssessmentTaskSource"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AssessmentTaskSource_checksumSha256_idx"
  ON "AssessmentTaskSource"("checksumSha256");

ALTER TABLE "AssessmentTaskSource"
  DROP CONSTRAINT IF EXISTS "AssessmentTaskSource_createdByUserId_fkey";
ALTER TABLE "AssessmentTaskSource"
  ADD CONSTRAINT "AssessmentTaskSource_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentScenario"
  ADD COLUMN IF NOT EXISTS "status" "AssessmentScenarioStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

-- Existing seed/live scenarios remain publicly available.
UPDATE "AssessmentScenario"
SET
  "status" = 'PUBLISHED',
  "publishedAt" = COALESCE("publishedAt", "createdAt")
WHERE "isActive" = true AND "status" = 'DRAFT';

CREATE INDEX IF NOT EXISTS "AssessmentScenario_status_isActive_sortOrder_idx"
  ON "AssessmentScenario"("status", "isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "AssessmentScenario_sourceId_idx"
  ON "AssessmentScenario"("sourceId");

ALTER TABLE "AssessmentScenario"
  DROP CONSTRAINT IF EXISTS "AssessmentScenario_sourceId_fkey";
ALTER TABLE "AssessmentScenario"
  ADD CONSTRAINT "AssessmentScenario_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "AssessmentTaskSource"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentScenarioCompetency"
  ADD COLUMN IF NOT EXISTS "competencyId" TEXT,
  ADD COLUMN IF NOT EXISTS "rubricSetId" TEXT;

CREATE INDEX IF NOT EXISTS "AssessmentScenarioCompetency_competencyId_idx"
  ON "AssessmentScenarioCompetency"("competencyId");
CREATE INDEX IF NOT EXISTS "AssessmentScenarioCompetency_rubricSetId_idx"
  ON "AssessmentScenarioCompetency"("rubricSetId");

ALTER TABLE "AssessmentScenarioCompetency"
  DROP CONSTRAINT IF EXISTS "AssessmentScenarioCompetency_competencyId_fkey";
ALTER TABLE "AssessmentScenarioCompetency"
  ADD CONSTRAINT "AssessmentScenarioCompetency_competencyId_fkey"
  FOREIGN KEY ("competencyId") REFERENCES "Competency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentScenarioCompetency"
  DROP CONSTRAINT IF EXISTS "AssessmentScenarioCompetency_rubricSetId_fkey";
ALTER TABLE "AssessmentScenarioCompetency"
  ADD CONSTRAINT "AssessmentScenarioCompetency_rubricSetId_fkey"
  FOREIGN KEY ("rubricSetId") REFERENCES "RubricSet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Soft-link existing scenario competencies to platform bank by code.
UPDATE "AssessmentScenarioCompetency" ASC
SET "competencyId" = C."id"
FROM "Competency" C
WHERE ASC."competencyId" IS NULL
  AND C."code" = ASC."competencyCode"
  AND C."organizationId" IS NULL
  AND C."ownerScope" = 'PLATFORM';

-- Prefer default FIVE_SCALE rubric set when available.
UPDATE "AssessmentScenarioCompetency" ASC
SET "rubricSetId" = RS."id"
FROM "RubricSet" RS
WHERE ASC."competencyId" IS NOT NULL
  AND ASC."rubricSetId" IS NULL
  AND RS."competencyId" = ASC."competencyId"
  AND RS."organizationId" IS NULL
  AND RS."isDefault" = true;

ALTER TABLE "AssessmentInBasketItem"
  ADD COLUMN IF NOT EXISTS "targetCompetencyId" TEXT;

CREATE INDEX IF NOT EXISTS "AssessmentInBasketItem_targetCompetencyId_idx"
  ON "AssessmentInBasketItem"("targetCompetencyId");

ALTER TABLE "AssessmentInBasketItem"
  DROP CONSTRAINT IF EXISTS "AssessmentInBasketItem_targetCompetencyId_fkey";
ALTER TABLE "AssessmentInBasketItem"
  ADD CONSTRAINT "AssessmentInBasketItem_targetCompetencyId_fkey"
  FOREIGN KEY ("targetCompetencyId") REFERENCES "Competency"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "AssessmentInBasketItem" I
SET "targetCompetencyId" = C."id"
FROM "Competency" C
WHERE I."targetCompetencyId" IS NULL
  AND I."targetCompetencyCode" IS NOT NULL
  AND C."code" = I."targetCompetencyCode"
  AND C."organizationId" IS NULL
  AND C."ownerScope" = 'PLATFORM';

ALTER TABLE "AssessmentAttempt"
  ADD COLUMN IF NOT EXISTS "frameworkSnapshot" JSONB;

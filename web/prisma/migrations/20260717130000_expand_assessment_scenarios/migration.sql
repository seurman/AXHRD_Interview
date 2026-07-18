-- Complete the assessment-center schema added after the initial evidence framework:
-- role-play personas, in-basket items, and organization share links.

ALTER TYPE "EvidenceAssessmentDomain" ADD VALUE IF NOT EXISTS 'IN_BASKET';

DO $$ BEGIN
  CREATE TYPE "AssessmentScenarioKind" AS ENUM ('ROLE_PLAY', 'IN_BASKET');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "assessmentEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AssessmentScenario"
  ADD COLUMN IF NOT EXISTS "kind" "AssessmentScenarioKind" NOT NULL DEFAULT 'ROLE_PLAY',
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "personaName" TEXT,
  ADD COLUMN IF NOT EXISTS "personaRole" TEXT,
  ADD COLUMN IF NOT EXISTS "personaProfile" TEXT,
  ADD COLUMN IF NOT EXISTS "openingLine" TEXT,
  ADD COLUMN IF NOT EXISTS "maxTurns" INTEGER NOT NULL DEFAULT 6;

CREATE INDEX IF NOT EXISTS "AssessmentScenario_organizationId_idx"
  ON "AssessmentScenario"("organizationId");
CREATE INDEX IF NOT EXISTS "AssessmentScenario_kind_isActive_sortOrder_idx"
  ON "AssessmentScenario"("kind", "isActive", "sortOrder");

ALTER TABLE "AssessmentScenario"
  ADD CONSTRAINT "AssessmentScenario_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssessmentInBasketItem" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "fromLabel" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "urgency" TEXT NOT NULL DEFAULT 'MEDIUM',
  "importance" TEXT NOT NULL DEFAULT 'MEDIUM',
  "isDistractor" BOOLEAN NOT NULL DEFAULT false,
  "targetCompetencyCode" TEXT,
  CONSTRAINT "AssessmentInBasketItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssessmentInBasketItem_scenarioId_sortOrder_idx"
  ON "AssessmentInBasketItem"("scenarioId", "sortOrder");
ALTER TABLE "AssessmentInBasketItem"
  ADD CONSTRAINT "AssessmentInBasketItem_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "AssessmentScenario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrgAssessmentShare" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrgAssessmentShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgAssessmentShare_slug_key" ON "OrgAssessmentShare"("slug");
CREATE INDEX "OrgAssessmentShare_organizationId_idx"
  ON "OrgAssessmentShare"("organizationId");
CREATE INDEX "OrgAssessmentShare_scenarioId_idx"
  ON "OrgAssessmentShare"("scenarioId");
ALTER TABLE "OrgAssessmentShare"
  ADD CONSTRAINT "OrgAssessmentShare_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgAssessmentShare"
  ADD CONSTRAINT "OrgAssessmentShare_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "AssessmentScenario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgAssessmentShare"
  ADD CONSTRAINT "OrgAssessmentShare_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssessmentAttempt" ADD COLUMN IF NOT EXISTS "orgShareId" TEXT;
CREATE INDEX IF NOT EXISTS "AssessmentAttempt_orgShareId_idx"
  ON "AssessmentAttempt"("orgShareId");
ALTER TABLE "AssessmentAttempt"
  ADD CONSTRAINT "AssessmentAttempt_orgShareId_fkey"
  FOREIGN KEY ("orgShareId") REFERENCES "OrgAssessmentShare"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AssessmentItemResponse" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "actionType" TEXT,
  "responseText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssessmentItemResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssessmentItemResponse_attemptId_itemId_key"
  ON "AssessmentItemResponse"("attemptId", "itemId");
CREATE INDEX "AssessmentItemResponse_itemId_idx"
  ON "AssessmentItemResponse"("itemId");
ALTER TABLE "AssessmentItemResponse"
  ADD CONSTRAINT "AssessmentItemResponse_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentItemResponse"
  ADD CONSTRAINT "AssessmentItemResponse_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "AssessmentInBasketItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

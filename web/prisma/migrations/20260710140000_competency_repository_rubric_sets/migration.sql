-- CreateEnum
CREATE TYPE "CompetencyLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "RubricScoringSystem" AS ENUM ('FIVE_SCALE', 'THREE_SCALE', 'PASS_FAIL');

-- AlterTable
ALTER TABLE "Competency" ADD COLUMN "lifecycleStatus" "CompetencyLifecycleStatus" NOT NULL DEFAULT 'DRAFT';

UPDATE "Competency"
SET "lifecycleStatus" = CASE
  WHEN "isActive" = false THEN 'ARCHIVED'::"CompetencyLifecycleStatus"
  ELSE 'ACTIVE'::"CompetencyLifecycleStatus"
END;

-- CreateTable
CREATE TABLE "RubricSet" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "competencyId" TEXT NOT NULL,
    "rubricName" TEXT NOT NULL,
    "scoringSystem" "RubricScoringSystem" NOT NULL DEFAULT 'FIVE_SCALE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RubricDetail" (
    "id" TEXT NOT NULL,
    "rubricSetId" TEXT NOT NULL,
    "scoreLevel" INTEGER NOT NULL,
    "levelName" TEXT,
    "behavioralIndicator" TEXT NOT NULL,

    CONSTRAINT "RubricDetail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionRubricMapping" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "rubricSetId" TEXT NOT NULL,

    CONSTRAINT "QuestionRubricMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RubricDetail_rubricSetId_scoreLevel_key" ON "RubricDetail"("rubricSetId", "scoreLevel");
CREATE UNIQUE INDEX "QuestionRubricMapping_questionId_rubricSetId_key" ON "QuestionRubricMapping"("questionId", "rubricSetId");
CREATE INDEX "RubricSet_competencyId_idx" ON "RubricSet"("competencyId");
CREATE INDEX "RubricSet_organizationId_idx" ON "RubricSet"("organizationId");
CREATE INDEX "QuestionRubricMapping_rubricSetId_idx" ON "QuestionRubricMapping"("rubricSetId");

ALTER TABLE "RubricSet" ADD CONSTRAINT "RubricSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricSet" ADD CONSTRAINT "RubricSet_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RubricDetail" ADD CONSTRAINT "RubricDetail_rubricSetId_fkey" FOREIGN KEY ("rubricSetId") REFERENCES "RubricSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionRubricMapping" ADD CONSTRAINT "QuestionRubricMapping_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionRubricMapping" ADD CONSTRAINT "QuestionRubricMapping_rubricSetId_fkey" FOREIGN KEY ("rubricSetId") REFERENCES "RubricSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

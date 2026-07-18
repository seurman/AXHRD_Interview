-- Evidence assessment framework: rating anchors, subskills, role-play scenarios, unified reports

CREATE TYPE "BehaviorPolarity" AS ENUM ('POSITIVE', 'NEGATIVE_OR_MISSING');
CREATE TYPE "EvidenceAssessmentDomain" AS ENUM ('INTERVIEW', 'ROLE_PLAY', 'DIAGNOSTIC');
CREATE TYPE "AssessmentAttemptStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'SCORED');

ALTER TABLE "SessionReport" ADD COLUMN IF NOT EXISTS "evidenceJson" JSONB;
ALTER TABLE "SessionReport" ADD COLUMN IF NOT EXISTS "schemaVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "RatingScaleAnchor" (
    "id" TEXT NOT NULL,
    "domain" "EvidenceAssessmentDomain" NOT NULL,
    "score" INTEGER NOT NULL,
    "levelLabel" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatingScaleAnchor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RatingScaleAnchor_domain_score_key" ON "RatingScaleAnchor"("domain", "score");
CREATE INDEX "RatingScaleAnchor_domain_idx" ON "RatingScaleAnchor"("domain");

CREATE TABLE "CompetencySubskill" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompetencySubskill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompetencySubskill_competencyId_code_key" ON "CompetencySubskill"("competencyId", "code");
CREATE INDEX "CompetencySubskill_competencyId_idx" ON "CompetencySubskill"("competencyId");
ALTER TABLE "CompetencySubskill" ADD CONSTRAINT "CompetencySubskill_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BehavioralIndicator" (
    "id" TEXT NOT NULL,
    "subskillId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "polarity" "BehaviorPolarity" NOT NULL,
    "textKo" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "BehavioralIndicator_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BehavioralIndicator_subskillId_code_key" ON "BehavioralIndicator"("subskillId", "code");
CREATE INDEX "BehavioralIndicator_subskillId_idx" ON "BehavioralIndicator"("subskillId");
ALTER TABLE "BehavioralIndicator" ADD CONSTRAINT "BehavioralIndicator_subskillId_fkey" FOREIGN KEY ("subskillId") REFERENCES "CompetencySubskill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssessmentScenario" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "titleKo" TEXT NOT NULL,
    "reportKindLabel" TEXT NOT NULL DEFAULT 'ASSESSMENT REPORT · 역할수행 과제',
    "roleContext" TEXT,
    "taskBrief" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "recommendedSequence" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentScenario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentScenario_code_key" ON "AssessmentScenario"("code");

CREATE TABLE "AssessmentScenarioCompetency" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "competencyCode" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AssessmentScenarioCompetency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentScenarioCompetency_scenarioId_competencyCode_key" ON "AssessmentScenarioCompetency"("scenarioId", "competencyCode");
CREATE INDEX "AssessmentScenarioCompetency_scenarioId_idx" ON "AssessmentScenarioCompetency"("scenarioId");
ALTER TABLE "AssessmentScenarioCompetency" ADD CONSTRAINT "AssessmentScenarioCompetency_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "AssessmentScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssessmentScenarioSubskill" (
    "id" TEXT NOT NULL,
    "scenarioCompetencyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AssessmentScenarioSubskill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentScenarioSubskill_scenarioCompetencyId_code_key" ON "AssessmentScenarioSubskill"("scenarioCompetencyId", "code");
CREATE INDEX "AssessmentScenarioSubskill_scenarioCompetencyId_idx" ON "AssessmentScenarioSubskill"("scenarioCompetencyId");
ALTER TABLE "AssessmentScenarioSubskill" ADD CONSTRAINT "AssessmentScenarioSubskill_scenarioCompetencyId_fkey" FOREIGN KEY ("scenarioCompetencyId") REFERENCES "AssessmentScenarioCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssessmentScenarioIndicator" (
    "id" TEXT NOT NULL,
    "subskillId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "polarity" "BehaviorPolarity" NOT NULL,
    "textKo" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AssessmentScenarioIndicator_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AssessmentScenarioIndicator_subskillId_code_key" ON "AssessmentScenarioIndicator"("subskillId", "code");
CREATE INDEX "AssessmentScenarioIndicator_subskillId_idx" ON "AssessmentScenarioIndicator"("subskillId");
ALTER TABLE "AssessmentScenarioIndicator" ADD CONSTRAINT "AssessmentScenarioIndicator_subskillId_fkey" FOREIGN KEY ("subskillId") REFERENCES "AssessmentScenarioSubskill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "status" "AssessmentAttemptStatus" NOT NULL DEFAULT 'DRAFT',
    "transcript" TEXT,
    "dialogueJson" JSONB,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssessmentAttempt_userId_createdAt_idx" ON "AssessmentAttempt"("userId", "createdAt" DESC);
CREATE INDEX "AssessmentAttempt_scenarioId_idx" ON "AssessmentAttempt"("scenarioId");
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "AssessmentScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BehavioralAssessmentReport" (
    "id" TEXT NOT NULL,
    "domain" "EvidenceAssessmentDomain" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "overallScore" DOUBLE PRECISION,
    "title" TEXT,
    "roleContext" TEXT,
    "reportJson" JSONB NOT NULL,
    "attemptId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehavioralAssessmentReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BehavioralAssessmentReport_attemptId_key" ON "BehavioralAssessmentReport"("attemptId");
CREATE UNIQUE INDEX "BehavioralAssessmentReport_sourceType_sourceId_key" ON "BehavioralAssessmentReport"("sourceType", "sourceId");
CREATE INDEX "BehavioralAssessmentReport_domain_generatedAt_idx" ON "BehavioralAssessmentReport"("domain", "generatedAt" DESC);
ALTER TABLE "BehavioralAssessmentReport" ADD CONSTRAINT "BehavioralAssessmentReport_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

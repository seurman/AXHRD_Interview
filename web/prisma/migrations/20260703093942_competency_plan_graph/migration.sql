-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "CompetencyProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SessionMode" AS ENUM ('COMPETENCY', 'FULL');

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "focusCompetency" TEXT,
ADD COLUMN     "mode" "SessionMode" NOT NULL DEFAULT 'COMPETENCY',
ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "InterviewPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCompanyId" TEXT,
    "resumeId" TEXT,
    "jobRole" "JobRole" NOT NULL DEFAULT 'OTHER',
    "status" "PlanStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyProgress" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "status" "CompetencyProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "latestTheta" DOUBLE PRECISION,
    "levelEst" INTEGER,
    "percentile" DOUBLE PRECISION,
    "lastSessionId" TEXT,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyFeedback" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "dimensions" JSONB,
    "suggestions" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencyFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewPlan_userId_status_idx" ON "InterviewPlan"("userId", "status");

-- CreateIndex
CREATE INDEX "CompetencyProgress_userId_competency_idx" ON "CompetencyProgress"("userId", "competency");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyProgress_planId_competency_key" ON "CompetencyProgress"("planId", "competency");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyFeedback_progressId_key" ON "CompetencyFeedback"("progressId");

-- CreateIndex
CREATE INDEX "InterviewSession_planId_idx" ON "InterviewSession"("planId");

-- AddForeignKey
ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPlan" ADD CONSTRAINT "InterviewPlan_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyProgress" ADD CONSTRAINT "CompetencyProgress_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyProgress" ADD CONSTRAINT "CompetencyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyFeedback" ADD CONSTRAINT "CompetencyFeedback_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "CompetencyProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InterviewPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('LARGE', 'MID', 'SMALL', 'STARTUP', 'PUBLIC');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SETUP', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ChipType" AS ENUM ('PASS', 'ATTEMPT', 'DOWNGRADE');

-- CreateEnum
CREATE TYPE "JobRole" AS ENUM ('MARKETING', 'DEVELOPMENT', 'BUSINESS_SUPPORT', 'SALES', 'DESIGN', 'HR', 'FINANCE', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "careerYears" INTEGER NOT NULL DEFAULT 0,
    "education" TEXT,
    "desiredJobRole" "JobRole" NOT NULL DEFAULT 'OTHER',
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size" "CompanySize" NOT NULL DEFAULT 'LARGE',
    "interviewStyle" JSONB,
    "enrichedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "rawText" TEXT NOT NULL,
    "parsedTags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Competency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "discrimination" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "template" TEXT NOT NULL,
    "followUpHints" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCompanyId" TEXT,
    "resumeId" TEXT,
    "jobRole" "JobRole" NOT NULL DEFAULT 'OTHER',
    "status" "SessionStatus" NOT NULL DEFAULT 'SETUP',
    "sessionNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "overallTheta" DOUBLE PRECISION,
    "irtState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "transcript" TEXT NOT NULL,
    "audioUrl" TEXT,
    "rubricScore" DOUBLE PRECISION NOT NULL,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "chipType" "ChipType" NOT NULL,
    "rubricScore" DOUBLE PRECISION NOT NULL,
    "briefFeedback" TEXT,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencySnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "theta" DOUBLE PRECISION NOT NULL,
    "se" DOUBLE PRECISION NOT NULL,
    "levelEst" INTEGER NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionReport" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "summaryHtml" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "TargetCompany_userId_idx" ON "TargetCompany"("userId");

-- CreateIndex
CREATE INDEX "Resume_userId_idx" ON "Resume"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Competency_code_key" ON "Competency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Question_externalId_key" ON "Question"("externalId");

-- CreateIndex
CREATE INDEX "Question_competencyId_level_idx" ON "Question"("competencyId", "level");

-- CreateIndex
CREATE INDEX "InterviewSession_userId_sessionNumber_idx" ON "InterviewSession"("userId", "sessionNumber");

-- CreateIndex
CREATE INDEX "InterviewSession_status_idx" ON "InterviewSession"("status");

-- CreateIndex
CREATE INDEX "ResponseRecord_sessionId_idx" ON "ResponseRecord"("sessionId");

-- CreateIndex
CREATE INDEX "ChipEvent_sessionId_idx" ON "ChipEvent"("sessionId");

-- CreateIndex
CREATE INDEX "CompetencySnapshot_userId_competency_idx" ON "CompetencySnapshot"("userId", "competency");

-- CreateIndex
CREATE INDEX "CompetencySnapshot_userId_recordedAt_idx" ON "CompetencySnapshot"("userId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionReport_sessionId_key" ON "SessionReport"("sessionId");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetCompany" ADD CONSTRAINT "TargetCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseRecord" ADD CONSTRAINT "ResponseRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseRecord" ADD CONSTRAINT "ResponseRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipEvent" ADD CONSTRAINT "ChipEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencySnapshot" ADD CONSTRAINT "CompetencySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

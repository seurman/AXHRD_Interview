-- AlterTable
ALTER TABLE "TargetCompany" ADD COLUMN "jdRequirements" JSONB;

-- CreateTable
CREATE TABLE "ResumeReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "targetCompanyId" TEXT,
    "matchSource" TEXT NOT NULL,
    "overallSummary" TEXT NOT NULL,
    "paragraphFeedback" JSONB NOT NULL,
    "jdMatch" JSONB NOT NULL,
    "improvementPlan" JSONB NOT NULL,
    "suggestedCompetencies" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeReview_userId_createdAt_idx" ON "ResumeReview"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ResumeReview_resumeId_idx" ON "ResumeReview"("resumeId");

-- AddForeignKey
ALTER TABLE "ResumeReview" ADD CONSTRAINT "ResumeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeReview" ADD CONSTRAINT "ResumeReview_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeReview" ADD CONSTRAINT "ResumeReview_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

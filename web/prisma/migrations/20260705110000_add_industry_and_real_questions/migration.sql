-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('IT_SW', 'FINANCE', 'MANUFACTURING', 'PUBLIC', 'OTHER');

-- AlterTable
ALTER TABLE "TargetCompany" ADD COLUMN     "industryCode" "Industry";

-- CreateTable
CREATE TABLE "RealInterviewQuestion" (
    "id" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "jobRole" "JobRole" NOT NULL,
    "competency" TEXT,
    "questionText" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "isAiExample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealInterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealInterviewQuestion_industry_jobRole_idx" ON "RealInterviewQuestion"("industry", "jobRole");

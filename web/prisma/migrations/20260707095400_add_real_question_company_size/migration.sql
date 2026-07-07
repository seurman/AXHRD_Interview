-- AlterTable
ALTER TABLE "RealInterviewQuestion" ADD COLUMN "companySize" "CompanySize";

-- CreateIndex
CREATE INDEX "RealInterviewQuestion_industry_jobRole_companySize_idx" ON "RealInterviewQuestion"("industry", "jobRole", "companySize");

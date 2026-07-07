-- CreateTable
CREATE TABLE "OrgInterviewKit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "selectedQuestionIds" JSONB NOT NULL DEFAULT '[]',
    "customRubricCriteria" JSONB NOT NULL DEFAULT '[]',
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgInterviewKit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgInterviewKit_organizationId_idx" ON "OrgInterviewKit"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInterviewKit_organizationId_competency_key" ON "OrgInterviewKit"("organizationId", "competency");

-- AddForeignKey
ALTER TABLE "OrgInterviewKit" ADD CONSTRAINT "OrgInterviewKit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInterviewKit" ADD CONSTRAINT "OrgInterviewKit_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

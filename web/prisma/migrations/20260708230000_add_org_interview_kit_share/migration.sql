-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "kitOrganizationId" TEXT,
ADD COLUMN     "orgKitShareId" TEXT;

-- CreateTable
CREATE TABLE "OrgInterviewKitShare" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "competencies" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgInterviewKitShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgInterviewKitShare_slug_key" ON "OrgInterviewKitShare"("slug");

-- CreateIndex
CREATE INDEX "OrgInterviewKitShare_organizationId_idx" ON "OrgInterviewKitShare"("organizationId");

-- CreateIndex
CREATE INDEX "InterviewSession_kitOrganizationId_idx" ON "InterviewSession"("kitOrganizationId");

-- CreateIndex
CREATE INDEX "InterviewSession_orgKitShareId_idx" ON "InterviewSession"("orgKitShareId");

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_orgKitShareId_fkey" FOREIGN KEY ("orgKitShareId") REFERENCES "OrgInterviewKitShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInterviewKitShare" ADD CONSTRAINT "OrgInterviewKitShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInterviewKitShare" ADD CONSTRAINT "OrgInterviewKitShare_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

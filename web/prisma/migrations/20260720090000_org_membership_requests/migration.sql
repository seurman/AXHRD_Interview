-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "requireMembershipApproval" BOOLEAN NOT NULL DEFAULT true;

-- CreateEnum
CREATE TYPE "OrgMembershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED');

-- CreateTable
CREATE TABLE "OrgMembershipRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "OrgMembershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "rejectReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMembershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrgMembershipRequest_organizationId_status_createdAt_idx" ON "OrgMembershipRequest"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OrgMembershipRequest_userId_status_idx" ON "OrgMembershipRequest"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMembershipRequest_organizationId_userId_pending_key" ON "OrgMembershipRequest"("organizationId", "userId") WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "OrgMembershipRequest" ADD CONSTRAINT "OrgMembershipRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembershipRequest" ADD CONSTRAINT "OrgMembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembershipRequest" ADD CONSTRAINT "OrgMembershipRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

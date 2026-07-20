-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogoutAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_lastLoginAt_idx" ON "User"("lastLoginAt" DESC);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrgMemberFeedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberUserId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgMemberFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgMemberFeedback_organizationId_memberUserId_createdAt_idx"
  ON "OrgMemberFeedback"("organizationId", "memberUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgMemberFeedback_memberUserId_createdAt_idx"
  ON "OrgMemberFeedback"("memberUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OrgMemberFeedback_authorUserId_idx"
  ON "OrgMemberFeedback"("authorUserId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "OrgMemberFeedback"
    ADD CONSTRAINT "OrgMemberFeedback_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrgMemberFeedback"
    ADD CONSTRAINT "OrgMemberFeedback_memberUserId_fkey"
    FOREIGN KEY ("memberUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrgMemberFeedback"
    ADD CONSTRAINT "OrgMemberFeedback_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "seatQuantity" INTEGER;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "OrgInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrgInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "orgRole" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "status" "OrgInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrgInvitation_token_key" ON "OrgInvitation"("token");
CREATE INDEX IF NOT EXISTS "OrgInvitation_organizationId_status_createdAt_idx" ON "OrgInvitation"("organizationId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "OrgInvitation_email_status_idx" ON "OrgInvitation"("email", "status");

DO $$ BEGIN
  ALTER TABLE "OrgInvitation" ADD CONSTRAINT "OrgInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "OrgInvitation" ADD CONSTRAINT "OrgInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

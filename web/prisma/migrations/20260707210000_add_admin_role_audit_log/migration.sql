-- AlterEnum: PlatformRole + ADMIN (레거시 CONTENT_ADMIN은 코드에서 ADMIN과 동일 취급)
ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'BULK_IMPORT', 'ROLE_GRANT', 'ORG_APPROVE', 'ORG_REJECT');

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorRole" "PlatformRole" NOT NULL,
    "action" "AdminAuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");
CREATE INDEX "AdminAuditLog_actorId_idx" ON "AdminAuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_rolledBackBy_fkey" FOREIGN KEY ("rolledBackBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

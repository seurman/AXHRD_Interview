-- 기관 계약 기간·좌석 상한·슈퍼어드민 CRUD 지원
ALTER TABLE "Organization" ADD COLUMN "validFrom" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "validUntil" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "maxSeats" INTEGER;
ALTER TABLE "Organization" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "Organization" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AdminAuditAction enum 확장
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ORG_CREATE';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ORG_UPDATE';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'ORG_DELETE';

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedAt" TIMESTAMP(3);

-- Backfill: 이 마이그레이션 이전에 이미 만들어진 기관은 승인 절차 도입 전에
-- 생성된 것이므로 승인된 것으로 간주한다. 신규 생성 기관부터 PENDING으로
-- 시작해 슈퍼어드민 승인을 거치도록 한다.
UPDATE "Organization" SET "status" = 'APPROVED', "approvedAt" = "createdAt" WHERE "status" = 'PENDING';

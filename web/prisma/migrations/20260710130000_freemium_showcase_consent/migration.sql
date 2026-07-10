-- CreateEnum
CREATE TYPE "SignupFlag" AS ENUM ('NONE', 'REVIEW');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "dataUseConsentAt" TIMESTAMP(3),
ADD COLUMN "signupFlag" "SignupFlag" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "isShowcase" BOOLEAN NOT NULL DEFAULT false;

-- Bootstrap: 역량별 L3 문항 1개씩 쇼케이스로 지정 (관리자 CMS에서 조정 가능)
UPDATE "Question" q
SET "isShowcase" = true
FROM (
  SELECT DISTINCT ON ("competencyId") id
  FROM "Question"
  WHERE "isActive" = true
    AND "level" = 3
    AND "ownerScope" = 'PLATFORM'
    AND "organizationId" IS NULL
  ORDER BY "competencyId", "sortOrder", "externalId"
) sub
WHERE q.id = sub.id;

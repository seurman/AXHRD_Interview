-- Platform internal roles: BUSINESS_ADMIN (solutions/manuals), DEMO_ADMIN (sales)
ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'BUSINESS_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'DEMO_ADMIN';

-- End-user org role: 학생·직장인·지원자 통합
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'MEMBER';

UPDATE "User" SET "orgRole" = 'MEMBER' WHERE "orgRole" = 'STUDENT';

-- Legacy 회사 어드민 → 데모 어드민 (영업·시연)
UPDATE "User" SET "platformRole" = 'DEMO_ADMIN' WHERE "platformRole" = 'ADMIN';

ALTER TABLE "User" ALTER COLUMN "orgRole" SET DEFAULT 'MEMBER';

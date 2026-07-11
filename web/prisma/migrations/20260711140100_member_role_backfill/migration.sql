-- Backfill after enum values committed (separate migration from ADD VALUE)
UPDATE "User" SET "orgRole" = 'MEMBER' WHERE "orgRole" = 'STUDENT';

UPDATE "User" SET "platformRole" = 'DEMO_ADMIN' WHERE "platformRole" = 'ADMIN';

ALTER TABLE "User" ALTER COLUMN "orgRole" SET DEFAULT 'MEMBER';

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('NONE', 'CONTENT_ADMIN', 'SUPERADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Competency" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Competency" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "rubricCriteria" JSONB;
ALTER TABLE "Question" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

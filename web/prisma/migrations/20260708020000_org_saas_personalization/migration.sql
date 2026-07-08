-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "saasPersonalizationEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "saasPersonalizationEnabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "orgCoachingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "orgCoachingConsentAt" TIMESTAMP(3);

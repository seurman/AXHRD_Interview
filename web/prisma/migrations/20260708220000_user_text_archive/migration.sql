-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN "setupSelectionText" TEXT;

-- CreateEnum
CREATE TYPE "UserTextRecordKind" AS ENUM (
  'INTERVIEW_SETUP',
  'INTERVIEW_ANSWER',
  'INTERVIEW_FOLLOW_UP',
  'SELF_DISCOVERY_ANSWER',
  'SWIPE_SELECTION',
  'SWIPE_PRACTICE',
  'PROFILE_PREFERENCE'
);

-- CreateTable
CREATE TABLE "UserTextRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UserTextRecordKind" NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTextRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTextRecord_userId_kind_createdAt_idx" ON "UserTextRecord"("userId", "kind", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserTextRecord_userId_createdAt_idx" ON "UserTextRecord"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserTextRecord" ADD CONSTRAINT "UserTextRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

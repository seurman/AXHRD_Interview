-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN "pasteDetected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InterviewSession" ADD COLUMN "tabSwitchCount" INTEGER NOT NULL DEFAULT 0;

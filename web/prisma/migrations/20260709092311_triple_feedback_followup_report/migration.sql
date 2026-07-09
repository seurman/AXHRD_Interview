-- AlterTable
ALTER TABLE "ChipEvent" ADD COLUMN     "tripleFeedback" JSONB;

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "tripleFeedbackMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" DROP DEFAULT;

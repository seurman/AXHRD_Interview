-- AlterTable
ALTER TABLE "ResponseRecord" ADD COLUMN     "initialRubricScore" DOUBLE PRECISION,
ADD COLUMN     "followUpQuestion" TEXT,
ADD COLUMN     "followUpTranscript" TEXT,
ADD COLUMN     "followUpCorrectedTranscript" TEXT;

-- AlterTable
ALTER TABLE "ChipEvent" ADD COLUMN     "hadFollowUp" BOOLEAN NOT NULL DEFAULT false;

-- DropForeignKey
ALTER TABLE "ResponseRecord" DROP CONSTRAINT "ResponseRecord_questionId_fkey";

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "jdBonusEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ResponseRecord" ADD COLUMN     "bonusBriefFeedback" TEXT,
ADD COLUMN     "bonusGroundedRequirement" TEXT,
ADD COLUMN     "bonusQuestionText" TEXT,
ADD COLUMN     "isBonusQuestion" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "questionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ResponseRecord" ADD CONSTRAINT "ResponseRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

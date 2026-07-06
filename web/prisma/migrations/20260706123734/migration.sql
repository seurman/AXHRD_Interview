-- AlterTable
ALTER TABLE "CompetencyFeedback" ADD COLUMN     "personaAlignmentNote" TEXT;

-- AlterTable
ALTER TABLE "TargetCompany" ADD COLUMN     "persona" JSONB;

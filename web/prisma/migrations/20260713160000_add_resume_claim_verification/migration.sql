-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN "resumeClaimEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ResponseRecord" ADD COLUMN "isClaimVerification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ResponseRecord" ADD COLUMN "claimVerificationClaim" TEXT;
ALTER TABLE "ResponseRecord" ADD COLUMN "claimVerificationLabel" TEXT;
ALTER TABLE "ResponseRecord" ADD COLUMN "claimVerificationReasoning" TEXT;

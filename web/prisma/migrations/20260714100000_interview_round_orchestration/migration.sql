-- Interview round orchestration: multi-competency queue, time budget, round brief

ALTER TABLE "InterviewPlan" ADD COLUMN "roundCompetencyCodes" JSONB;
ALTER TABLE "InterviewPlan" ADD COLUMN "queuedCompetencyCodes" JSONB;
ALTER TABLE "InterviewPlan" ADD COLUMN "timeBudgetMinutes" INTEGER;
ALTER TABLE "InterviewPlan" ADD COLUMN "prepMode" TEXT;
ALTER TABLE "InterviewPlan" ADD COLUMN "roundBrief" JSONB;

ALTER TABLE "InterviewSession" ADD COLUMN "timeBudgetMinutes" INTEGER;
ALTER TABLE "InterviewSession" ADD COLUMN "queuedCompetencyCodes" JSONB;
ALTER TABLE "InterviewSession" ADD COLUMN "roundIndex" INTEGER;

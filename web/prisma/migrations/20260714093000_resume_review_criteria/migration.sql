-- CreateTable
CREATE TABLE "ResumeReviewCriterion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "howToCheck" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeReviewCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeReviewCriterion_code_key" ON "ResumeReviewCriterion"("code");

-- CreateIndex
CREATE INDEX "ResumeReviewCriterion_category_sortOrder_idx" ON "ResumeReviewCriterion"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "ResumeReviewCriterion_isActive_sortOrder_idx" ON "ResumeReviewCriterion"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "ResumeReview" ADD COLUMN "dimensionScores" JSONB;
ALTER TABLE "ResumeReview" ADD COLUMN "criteriaResults" JSONB;

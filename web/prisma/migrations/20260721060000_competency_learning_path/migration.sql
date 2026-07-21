-- Competency learning path + Individual Premium plan
ALTER TYPE "PlanTier" ADD VALUE IF NOT EXISTS 'INDIVIDUAL_PREMIUM';

CREATE TYPE "CareerTrack" AS ENUM ('NEW_GRAD', 'EXPERIENCED');
CREATE TYPE "LessonKind" AS ENUM ('CONCEPT', 'FRAMEWORK', 'SWIPE_DRILL', 'WEAKNESS_DRILL', 'MOCK', 'CERTIFY');

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "careerTrack" "CareerTrack" NOT NULL DEFAULT 'NEW_GRAD';

CREATE TABLE IF NOT EXISTS "CompetencyLesson" (
    "id" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "track" "CareerTrack",
    "stage" INTEGER NOT NULL,
    "kind" "LessonKind" NOT NULL,
    "slug" TEXT NOT NULL,
    "titleKo" TEXT NOT NULL,
    "bodyMd" TEXT,
    "quizJson" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetencyLesson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompetencyLesson_competency_slug_key" ON "CompetencyLesson"("competency", "slug");
CREATE INDEX IF NOT EXISTS "CompetencyLesson_competency_stage_published_idx" ON "CompetencyLesson"("competency", "stage", "published");
CREATE INDEX IF NOT EXISTS "CompetencyLesson_kind_published_idx" ON "CompetencyLesson"("kind", "published");

CREATE TABLE IF NOT EXISTS "LearningPathProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "track" "CareerTrack" NOT NULL DEFAULT 'NEW_GRAD',
    "unlockedStage" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastDrillAt" TIMESTAMP(3),
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningPathProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LearningPathProgress_userId_competency_track_key" ON "LearningPathProgress"("userId", "competency", "track");
CREATE INDEX IF NOT EXISTS "LearningPathProgress_userId_track_idx" ON "LearningPathProgress"("userId", "track");
CREATE INDEX IF NOT EXISTS "LearningPathProgress_userId_lastDrillAt_idx" ON "LearningPathProgress"("userId", "lastDrillAt");

CREATE TABLE IF NOT EXISTS "LessonCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LessonCompletion_userId_lessonId_key" ON "LessonCompletion"("userId", "lessonId");
CREATE INDEX IF NOT EXISTS "LessonCompletion_userId_createdAt_idx" ON "LessonCompletion"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "DrillAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competency" TEXT,
    "kind" TEXT NOT NULL,
    "lessonId" TEXT,
    "swipeId" TEXT,
    "unscored" BOOLEAN NOT NULL DEFAULT true,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrillAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DrillAttempt_userId_createdAt_idx" ON "DrillAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "DrillAttempt_userId_kind_createdAt_idx" ON "DrillAttempt"("userId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "DrillAttempt_competency_createdAt_idx" ON "DrillAttempt"("competency", "createdAt");

DO $$ BEGIN
  ALTER TABLE "LearningPathProgress" ADD CONSTRAINT "LearningPathProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CompetencyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DrillAttempt" ADD CONSTRAINT "DrillAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

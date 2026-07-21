-- CreateTable
CREATE TABLE "CompetencyGameRuntimeConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "disabledGameTypes" JSONB NOT NULL DEFAULT '[]',
    "disabledLevelIds" JSONB NOT NULL DEFAULT '[]',
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetencyGameRuntimeConfig_pkey" PRIMARY KEY ("id")
);

-- Seed default (all enabled — includes intent_read / best_worst levels)
INSERT INTO "CompetencyGameRuntimeConfig" ("id", "disabledGameTypes", "disabledLevelIds", "updatedAt", "createdAt")
VALUES ('default', '[]', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

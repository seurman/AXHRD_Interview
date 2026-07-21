-- CreateTable
CREATE TABLE "CompetencyGameProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "clearedLevelIds" JSONB NOT NULL DEFAULT '[]',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hearts" INTEGER NOT NULL DEFAULT 5,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastPlayAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetencyGameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetencyGameProgress_userId_lastPlayAt_idx" ON "CompetencyGameProgress"("userId", "lastPlayAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyGameProgress_userId_competency_key" ON "CompetencyGameProgress"("userId", "competency");

-- AddForeignKey
ALTER TABLE "CompetencyGameProgress" ADD CONSTRAINT "CompetencyGameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

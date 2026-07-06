-- CreateEnum
CREATE TYPE "SelfDiscoveryStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "SelfDiscoverySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SelfDiscoveryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SelfDiscoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfDiscoveryResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionCode" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfDiscoveryResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelfDiscoveryProfile" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "values" JSONB NOT NULL,
    "competencySignals" JSONB NOT NULL,
    "narrativeSummary" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelfDiscoveryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SelfDiscoverySession_userId_idx" ON "SelfDiscoverySession"("userId");

-- CreateIndex
CREATE INDEX "SelfDiscoveryResponse_sessionId_idx" ON "SelfDiscoveryResponse"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SelfDiscoveryProfile_sessionId_key" ON "SelfDiscoveryProfile"("sessionId");

-- AddForeignKey
ALTER TABLE "SelfDiscoverySession" ADD CONSTRAINT "SelfDiscoverySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfDiscoveryResponse" ADD CONSTRAINT "SelfDiscoveryResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SelfDiscoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfDiscoveryProfile" ADD CONSTRAINT "SelfDiscoveryProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SelfDiscoverySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

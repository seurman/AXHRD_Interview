-- CreateEnum
CREATE TYPE "SwipeActionType" AS ENUM ('PASS', 'SAVE');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "desiredIndustry" "Industry";

-- CreateTable
CREATE TABLE "SwipeAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "action" "SwipeActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwipeAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwipeAction_userId_action_idx" ON "SwipeAction"("userId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "SwipeAction_userId_questionId_key" ON "SwipeAction"("userId", "questionId");

-- AddForeignKey
ALTER TABLE "SwipeAction" ADD CONSTRAINT "SwipeAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwipeAction" ADD CONSTRAINT "SwipeAction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "RealInterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

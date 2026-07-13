-- CreateEnum
CREATE TYPE "DiagnosticTeamLevel" AS ENUM ('DIVISION', 'UNIT', 'TEAM');

-- AlterTable
ALTER TABLE "DiagnosticTeam" ADD COLUMN "level" "DiagnosticTeamLevel" NOT NULL DEFAULT 'TEAM';
ALTER TABLE "DiagnosticTeam" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "DiagnosticTeam_parentId_idx" ON "DiagnosticTeam"("parentId");
CREATE INDEX "DiagnosticTeam_waveId_level_idx" ON "DiagnosticTeam"("waveId", "level");

-- AddForeignKey
ALTER TABLE "DiagnosticTeam" ADD CONSTRAINT "DiagnosticTeam_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DiagnosticTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

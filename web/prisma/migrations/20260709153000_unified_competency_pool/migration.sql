-- CreateEnum
CREATE TYPE "CompetencySource" AS ENUM ('NCS', 'GLOBAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "CompetencyCluster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "source" "CompetencySource" NOT NULL DEFAULT 'CUSTOM',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CompetencyCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetencyBenchmarkRef" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "frameworkName" TEXT NOT NULL,
    "refLabel" TEXT NOT NULL,
    "refDefinition" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "licenseNote" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompetencyBenchmarkRef_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Competency" ADD COLUMN "nameEn" TEXT,
ADD COLUMN "clusterId" TEXT,
ADD COLUMN "source" "CompetencySource" NOT NULL DEFAULT 'NCS';

-- CreateIndex
CREATE UNIQUE INDEX "CompetencyCluster_code_key" ON "CompetencyCluster"("code");

-- CreateIndex
CREATE INDEX "Competency_clusterId_idx" ON "Competency"("clusterId");

-- CreateIndex
CREATE INDEX "Competency_source_idx" ON "Competency"("source");

-- CreateIndex
CREATE INDEX "CompetencyBenchmarkRef_competencyId_idx" ON "CompetencyBenchmarkRef"("competencyId");

-- AddForeignKey
ALTER TABLE "Competency" ADD CONSTRAINT "Competency_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "CompetencyCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetencyBenchmarkRef" ADD CONSTRAINT "CompetencyBenchmarkRef_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "Competency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

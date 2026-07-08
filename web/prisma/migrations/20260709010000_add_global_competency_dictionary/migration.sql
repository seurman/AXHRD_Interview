-- CreateTable
CREATE TABLE "GlobalCompetencyCluster" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GlobalCompetencyCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalCompetency" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GlobalCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalCompetencyRubricLevel" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "descriptionKo" TEXT NOT NULL,

    CONSTRAINT "GlobalCompetencyRubricLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalCompetencyQuestion" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GlobalCompetencyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalCompetencyBenchmarkRef" (
    "id" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "frameworkName" TEXT NOT NULL,
    "refLabel" TEXT NOT NULL,
    "refDefinition" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "licenseNote" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GlobalCompetencyBenchmarkRef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCompetencyCluster_code_key" ON "GlobalCompetencyCluster"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCompetency_code_key" ON "GlobalCompetency"("code");

-- CreateIndex
CREATE INDEX "GlobalCompetency_clusterId_idx" ON "GlobalCompetency"("clusterId");

-- CreateIndex
CREATE INDEX "GlobalCompetencyRubricLevel_competencyId_idx" ON "GlobalCompetencyRubricLevel"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCompetencyRubricLevel_competencyId_level_key" ON "GlobalCompetencyRubricLevel"("competencyId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalCompetencyQuestion_externalId_key" ON "GlobalCompetencyQuestion"("externalId");

-- CreateIndex
CREATE INDEX "GlobalCompetencyQuestion_competencyId_idx" ON "GlobalCompetencyQuestion"("competencyId");

-- CreateIndex
CREATE INDEX "GlobalCompetencyBenchmarkRef_competencyId_idx" ON "GlobalCompetencyBenchmarkRef"("competencyId");

-- AddForeignKey
ALTER TABLE "GlobalCompetency" ADD CONSTRAINT "GlobalCompetency_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "GlobalCompetencyCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalCompetencyRubricLevel" ADD CONSTRAINT "GlobalCompetencyRubricLevel_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "GlobalCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalCompetencyQuestion" ADD CONSTRAINT "GlobalCompetencyQuestion_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "GlobalCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalCompetencyBenchmarkRef" ADD CONSTRAINT "GlobalCompetencyBenchmarkRef_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "GlobalCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

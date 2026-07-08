-- CreateTable
CREATE TABLE "DemoWorkspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoCompetency" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rubricByLevel" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "DemoCompetency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoQuestion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "template" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rubricCriteria" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "DemoQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoWorkspace_slug_key" ON "DemoWorkspace"("slug");

-- CreateIndex
CREATE INDEX "DemoCompetency_workspaceId_idx" ON "DemoCompetency"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoCompetency_workspaceId_code_key" ON "DemoCompetency"("workspaceId", "code");

-- CreateIndex
CREATE INDEX "DemoQuestion_workspaceId_idx" ON "DemoQuestion"("workspaceId");

-- CreateIndex
CREATE INDEX "DemoQuestion_competencyId_idx" ON "DemoQuestion"("competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoQuestion_workspaceId_externalId_key" ON "DemoQuestion"("workspaceId", "externalId");

-- AddForeignKey
ALTER TABLE "DemoCompetency" ADD CONSTRAINT "DemoCompetency_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "DemoWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoQuestion" ADD CONSTRAINT "DemoQuestion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "DemoWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoQuestion" ADD CONSTRAINT "DemoQuestion_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "DemoCompetency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DiagnosticItemScaleType" AS ENUM ('AGREEMENT_5', 'RETRO_CHANGE_5', 'SPEED_5', 'OPEN_TEXT');
CREATE TYPE "DiagnosticResponseAxis" AS ENUM ('CURRENT', 'IMPORTANCE');
CREATE TYPE "DiagnosticWaveStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "diagnosticEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DiagnosticInstrument" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "estimatedMinutes" INTEGER,
    "minGroupSize" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticInstrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticSection" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DiagnosticSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticSubscale" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "isDriver" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DiagnosticSubscale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "subscaleId" TEXT,
    "itemCode" TEXT NOT NULL,
    "textKo" TEXT NOT NULL,
    "scaleType" "DiagnosticItemScaleType" NOT NULL DEFAULT 'AGREEMENT_5',
    "scaleLabels" JSONB,
    "hasImportanceAxis" BOOLEAN NOT NULL DEFAULT false,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "isDemographic" BOOLEAN NOT NULL DEFAULT false,
    "choiceOptions" JSONB,
    "order" INTEGER NOT NULL,

    CONSTRAINT "DiagnosticItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticWave" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "waveNumber" INTEGER NOT NULL,
    "label" TEXT,
    "status" "DiagnosticWaveStatus" NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticWave_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticTeam" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "slug" TEXT NOT NULL,

    CONSTRAINT "DiagnosticTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticResponse" (
    "id" TEXT NOT NULL,
    "waveId" TEXT NOT NULL,
    "teamId" TEXT,
    "respondentToken" TEXT NOT NULL,
    "demographics" JSONB,
    "consentAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiagnosticAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "axis" "DiagnosticResponseAxis" NOT NULL DEFAULT 'CURRENT',
    "numericValue" INTEGER,
    "textValue" TEXT,

    CONSTRAINT "DiagnosticAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiagnosticInstrument_code_key" ON "DiagnosticInstrument"("code");
CREATE UNIQUE INDEX "DiagnosticSection_instrumentId_code_key" ON "DiagnosticSection"("instrumentId", "code");
CREATE UNIQUE INDEX "DiagnosticSubscale_sectionId_code_key" ON "DiagnosticSubscale"("sectionId", "code");
CREATE UNIQUE INDEX "DiagnosticItem_sectionId_itemCode_key" ON "DiagnosticItem"("sectionId", "itemCode");
CREATE UNIQUE INDEX "DiagnosticWave_slug_key" ON "DiagnosticWave"("slug");
CREATE UNIQUE INDEX "DiagnosticWave_organizationId_instrumentId_waveNumber_key" ON "DiagnosticWave"("organizationId", "instrumentId", "waveNumber");
CREATE UNIQUE INDEX "DiagnosticTeam_waveId_slug_key" ON "DiagnosticTeam"("waveId", "slug");
CREATE UNIQUE INDEX "DiagnosticResponse_respondentToken_key" ON "DiagnosticResponse"("respondentToken");
CREATE UNIQUE INDEX "DiagnosticAnswer_responseId_itemId_axis_key" ON "DiagnosticAnswer"("responseId", "itemId", "axis");
CREATE INDEX "DiagnosticItem_subscaleId_idx" ON "DiagnosticItem"("subscaleId");
CREATE INDEX "DiagnosticWave_organizationId_idx" ON "DiagnosticWave"("organizationId");
CREATE INDEX "DiagnosticResponse_waveId_idx" ON "DiagnosticResponse"("waveId");
CREATE INDEX "DiagnosticResponse_teamId_idx" ON "DiagnosticResponse"("teamId");

ALTER TABLE "DiagnosticSection" ADD CONSTRAINT "DiagnosticSection_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "DiagnosticInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticSubscale" ADD CONSTRAINT "DiagnosticSubscale_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DiagnosticSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItem" ADD CONSTRAINT "DiagnosticItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DiagnosticSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticItem" ADD CONSTRAINT "DiagnosticItem_subscaleId_fkey" FOREIGN KEY ("subscaleId") REFERENCES "DiagnosticSubscale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticWave" ADD CONSTRAINT "DiagnosticWave_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "DiagnosticInstrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiagnosticWave" ADD CONSTRAINT "DiagnosticWave_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticTeam" ADD CONSTRAINT "DiagnosticTeam_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "DiagnosticWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticResponse" ADD CONSTRAINT "DiagnosticResponse_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "DiagnosticWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticResponse" ADD CONSTRAINT "DiagnosticResponse_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DiagnosticTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAnswer" ADD CONSTRAINT "DiagnosticAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "DiagnosticResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticAnswer" ADD CONSTRAINT "DiagnosticAnswer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "DiagnosticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

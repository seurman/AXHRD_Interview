-- DiagnosticReportProfile + wave instrument version snapshot
CREATE TABLE "DiagnosticReportProfile" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "waveId" TEXT,
    "name" TEXT NOT NULL,
    "isInstrumentDefault" BOOLEAN NOT NULL DEFAULT false,
    "presetCode" TEXT,
    "activeTabs" JSONB NOT NULL DEFAULT '["basic","detail","teams"]',
    "activeSectionCodes" JSONB,
    "minGroupSize" INTEGER,
    "showNarratives" BOOLEAN NOT NULL DEFAULT true,
    "showGapMatrix" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticReportProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiagnosticReportProfile_waveId_key" ON "DiagnosticReportProfile"("waveId");
CREATE INDEX "DiagnosticReportProfile_instrumentId_idx" ON "DiagnosticReportProfile"("instrumentId");

ALTER TABLE "DiagnosticReportProfile" ADD CONSTRAINT "DiagnosticReportProfile_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "DiagnosticInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiagnosticReportProfile" ADD CONSTRAINT "DiagnosticReportProfile_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "DiagnosticWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiagnosticWave" ADD COLUMN "instrumentVersionSnapshot" TEXT;

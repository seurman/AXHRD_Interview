-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "diagnosticPricing" JSONB;

-- AlterTable
ALTER TABLE "DiagnosticWave" ADD COLUMN "pricingQuote" JSONB;
ALTER TABLE "DiagnosticWave" ADD COLUMN "quotedFeeKrw" INTEGER;
ALTER TABLE "DiagnosticWave" ADD COLUMN "estimatedResponses" INTEGER;

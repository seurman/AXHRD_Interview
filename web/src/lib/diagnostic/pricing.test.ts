import { describe, expect, it } from "vitest";
import {
  defaultOrgDiagnosticPricing,
  quoteDiagnosticWave,
  resolveAnnualLicenseFeeKrw,
  WAVE_PACKAGE_TIERS,
} from "@/lib/diagnostic/pricing";

describe("quoteDiagnosticWave WAVE_PACKAGE", () => {
  it("charges base only within included responses", () => {
    const pricing = defaultOrgDiagnosticPricing("WAVE_PACKAGE");
    const q = quoteDiagnosticWave({ pricing, estimatedResponses: 150 });
    expect(q.waveFeeKrw).toBe(WAVE_PACKAGE_TIERS.GROWTH.waveFeeKrw);
    expect(q.overageResponses).toBe(0);
  });

  it("adds overage beyond included", () => {
    const pricing = defaultOrgDiagnosticPricing("WAVE_PACKAGE");
    const q = quoteDiagnosticWave({ pricing, estimatedResponses: 220 });
    expect(q.overageResponses).toBe(20);
    expect(q.waveFeeKrw).toBe(
      WAVE_PACKAGE_TIERS.GROWTH.waveFeeKrw + 20 * WAVE_PACKAGE_TIERS.GROWTH.overagePerResponseKrw,
    );
  });
});

describe("quoteDiagnosticWave SEAT_ANNUAL", () => {
  it("includes first waves at 0 incremental fee", () => {
    const pricing = defaultOrgDiagnosticPricing("SEAT_ANNUAL");
    const q = quoteDiagnosticWave({
      pricing,
      estimatedResponses: 100,
      wavesUsedThisYear: 0,
    });
    expect(q.waveFeeKrw).toBe(0);
    expect(resolveAnnualLicenseFeeKrw(pricing)).toBe(Math.max(2_000_000, 200 * 25_000));
  });

  it("charges extra wave after included", () => {
    const pricing = defaultOrgDiagnosticPricing("SEAT_ANNUAL");
    const q = quoteDiagnosticWave({
      pricing,
      estimatedResponses: 100,
      wavesUsedThisYear: 2,
    });
    expect(q.waveFeeKrw).toBe(1_000_000);
  });
});

describe("quoteDiagnosticWave PER_RESPONSE", () => {
  it("applies minimum wave fee", () => {
    const pricing = defaultOrgDiagnosticPricing("PER_RESPONSE");
    const q = quoteDiagnosticWave({ pricing, estimatedResponses: 10 });
    expect(q.waveFeeKrw).toBe(800_000);
  });

  it("meters large response counts", () => {
    const pricing = defaultOrgDiagnosticPricing("PER_RESPONSE");
    const q = quoteDiagnosticWave({ pricing, estimatedResponses: 100 });
    expect(q.waveFeeKrw).toBe(100 * 15_000);
  });
});

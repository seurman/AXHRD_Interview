import { describe, expect, it } from "vitest";
import {
  formatPriceKrw,
  INDIVIDUAL_PLAN_TIERS,
  PLANS,
  resolvePlanChargeAmount,
  SELF_SERVE_PLAN_TIERS,
} from "./plans";

describe("billing plans — competency learning tiers", () => {
  it("defines Free / Pro / Premium with drill + mock limits", () => {
    expect(PLANS.FREE.limits.dailyDrillsPerWeek).toBe(3);
    expect(PLANS.FREE.limits.mockInterviewsPerMonth).toBe(1);
    expect(PLANS.INDIVIDUAL_PRO.priceMonthlyKrw).toBe(9_900);
    expect(PLANS.INDIVIDUAL_PRO.limits.dailyDrillsPerWeek).toBeNull();
    expect(PLANS.INDIVIDUAL_PRO.limits.mockInterviewsPerMonth).toBe(4);
    expect(PLANS.INDIVIDUAL_PREMIUM.priceMonthlyKrw).toBe(24_900);
    expect(PLANS.INDIVIDUAL_PREMIUM.limits.mockInterviewsPerMonth).toBeNull();
    expect(PLANS.INDIVIDUAL_PREMIUM.limits.dailyDrillsPerWeek).toBeNull();
  });

  it("includes Premium in self-serve and individual tiers", () => {
    expect(SELF_SERVE_PLAN_TIERS).toContain("INDIVIDUAL_PREMIUM");
    expect(INDIVIDUAL_PLAN_TIERS).toEqual([
      "INDIVIDUAL_PRO",
      "INDIVIDUAL_PREMIUM",
    ]);
  });

  it("formats and resolves individual charge amounts", () => {
    expect(formatPriceKrw(0)).toBe("무료");
    expect(formatPriceKrw(9_900)).toBe("₩9,900/월");
    expect(resolvePlanChargeAmount("INDIVIDUAL_PRO")).toBe(9_900);
    expect(resolvePlanChargeAmount("INDIVIDUAL_PREMIUM")).toBe(24_900);
  });
});

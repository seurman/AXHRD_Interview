import { describe, expect, it } from "vitest";
import { buildIccInterpretation } from "@/lib/diagnostic/axis-report";

describe("buildIccInterpretation", () => {
  it("returns null for missing values", () => {
    expect(buildIccInterpretation(null)).toBeNull();
    expect(buildIccInterpretation(undefined)).toBeNull();
  });

  it("maps ICC bands to report guide copy", () => {
    expect(buildIccInterpretation(0.03)).toMatch(/조직 단위 해석/);
    expect(buildIccInterpretation(0.05)).toMatch(/보통 수준/);
    expect(buildIccInterpretation(0.12)).toMatch(/보통 수준/);
    expect(buildIccInterpretation(0.2)).toMatch(/보통 수준/);
    expect(buildIccInterpretation(0.21)).toMatch(/팀별 개입/);
  });
});

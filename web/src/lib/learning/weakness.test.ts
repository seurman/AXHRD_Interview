import { describe, expect, it } from "vitest";
import { COMPETENCY_LEARNING_META } from "./catalog";
import { findWeakestDimension } from "@/lib/interview/answer-dimensions";

describe("weakness mapping", () => {
  it("has tips and prompts for every competency", () => {
    for (const meta of Object.values(COMPETENCY_LEARNING_META)) {
      expect(meta.weaknessPrompt.length).toBeGreaterThan(10);
      expect(meta.certifyChecks.length).toBeGreaterThanOrEqual(3);
      expect(meta.ncsAnchor).toMatch(/NCS|직무/);
      expect(Object.keys(meta.dimensionTips).length).toBeGreaterThan(0);
    }
  });

  it("maps weakest delivery dimension toward communication coaching", () => {
    const weakest = findWeakestDimension({
      questionIntent: 0.8,
      situationSpecificity: 0.8,
      individualOwnership: 0.8,
      logic: 0.8,
      outcomeQuantification: 0.8,
      delivery: 0.2,
    });
    expect(weakest).toBe("delivery");
    expect(
      COMPETENCY_LEARNING_META.COMMUNICATION.dimensionTips.delivery,
    ).toBeTruthy();
  });
});

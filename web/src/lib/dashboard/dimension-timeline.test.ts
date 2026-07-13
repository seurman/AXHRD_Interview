import { describe, expect, it } from "vitest";
import {
  buildDimensionTimeline,
  compareDimensionHalves,
} from "@/lib/dashboard/dimension-timeline";

const sample6 = {
  questionIntent: 0.7,
  situationSpecificity: 0.6,
  individualOwnership: 0.5,
  logic: 0.8,
  outcomeQuantification: 0.4,
  delivery: 0.75,
};

describe("buildDimensionTimeline", () => {
  it("groups by session number and averages dimensions", () => {
    const timeline = buildDimensionTimeline([
      { sessionNumber: 1, dimensions: sample6 },
      { sessionNumber: 1, dimensions: { ...sample6, logic: 0.6 } },
      { sessionNumber: 2, dimensions: { ...sample6, delivery: 0.9 } },
    ]);

    expect(timeline).toHaveLength(2);
    expect(timeline[0].sessionNumber).toBe(1);
    expect(timeline[1].sessionNumber).toBe(2);
    expect(timeline[0].dimensions.logic).toBeCloseTo(0.7);
    expect(timeline[1].dimensions.delivery).toBe(0.9);
  });
});

describe("compareDimensionHalves", () => {
  it("returns null when fewer than 2 sessions", () => {
    expect(
      compareDimensionHalves([{ sessionNumber: 1, dimensions: sample6 }]),
    ).toBeNull();
  });

  it("splits timeline into recent and previous halves", () => {
    const timeline = buildDimensionTimeline([
      { sessionNumber: 1, dimensions: { ...sample6, delivery: 0.5 } },
      { sessionNumber: 2, dimensions: { ...sample6, delivery: 0.7 } },
      { sessionNumber: 3, dimensions: { ...sample6, delivery: 0.9 } },
    ]);
    const cmp = compareDimensionHalves(timeline);
    expect(cmp).not.toBeNull();
    expect(cmp!.previousSessionCount).toBe(2);
    expect(cmp!.recentSessionCount).toBe(1);
    expect(cmp!.recent.delivery).toBe(0.9);
  });
});

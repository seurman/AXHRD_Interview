import { describe, expect, it } from "vitest";
import {
  QUESTION_PERF_MIN_SAMPLE,
  computeQuestionPerformanceFromRows,
  emptyQuestionPerformance,
  flagQuestionPerformance,
} from "./question-performance";

describe("question-performance", () => {
  it("uses MIN_SAMPLE = 10 per spec", () => {
    expect(QUESTION_PERF_MIN_SAMPLE).toBe(10);
  });

  it("flags 표본부족 when sample below threshold", () => {
    expect(flagQuestionPerformance({ sampleSize: 0, avgRubricScore: 0, followUpRate: 0 })).toBe(
      "표본부족",
    );
    expect(flagQuestionPerformance({ sampleSize: 9, avgRubricScore: 0.9, followUpRate: 0 })).toBe(
      "표본부족",
    );
  });

  it("flags 너무쉬움 when avg > 0.85", () => {
    expect(
      flagQuestionPerformance({ sampleSize: 20, avgRubricScore: 0.86, followUpRate: 0.1 }),
    ).toBe("너무쉬움");
  });

  it("flags 너무어려움_모호함 when avg < 0.35 or followUp > 0.5", () => {
    expect(
      flagQuestionPerformance({ sampleSize: 20, avgRubricScore: 0.34, followUpRate: 0.1 }),
    ).toBe("너무어려움_모호함");
    expect(
      flagQuestionPerformance({ sampleSize: 20, avgRubricScore: 0.5, followUpRate: 0.51 }),
    ).toBe("너무어려움_모호함");
  });

  it("returns 정상 for mid-range stats", () => {
    expect(
      flagQuestionPerformance({ sampleSize: 20, avgRubricScore: 0.6, followUpRate: 0.2 }),
    ).toBe("정상");
  });

  it("handles empty rows without divide-by-zero", () => {
    expect(emptyQuestionPerformance()).toEqual({
      sampleSize: 0,
      avgRubricScore: 0,
      scoreDistribution: { low: 0, mid: 0, high: 0 },
      followUpRate: 0,
      flag: "표본부족",
    });
    expect(computeQuestionPerformanceFromRows([])).toEqual(emptyQuestionPerformance());
  });

  it("computes distribution buckets and follow-up with transcript requirement", () => {
    const stats = computeQuestionPerformanceFromRows([
      { rubricScore: 0.2, followUpQuestion: "q", followUpTranscript: "t" },
      { rubricScore: 0.5, followUpQuestion: "q", followUpTranscript: null },
      { rubricScore: 0.8, followUpQuestion: null, followUpTranscript: null },
    ]);
    expect(stats.sampleSize).toBe(3);
    expect(stats.scoreDistribution).toEqual({ low: 1, mid: 1, high: 1 });
    expect(stats.followUpRate).toBeCloseTo(1 / 3);
    expect(stats.avgRubricScore).toBeCloseTo(0.5);
  });
});

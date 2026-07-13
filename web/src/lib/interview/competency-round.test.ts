import { describe, expect, it } from "vitest";
import {
  questionsPerCompetencyForRound,
  clampTimeBudgetMinutes,
  TIME_BUDGET_MINUTES_OPTIONS,
} from "@/lib/interview/session-limits";
import {
  buildRoundBriefFromFeedbacks,
  normalizeRoundCompetencies,
  resolveRoundQuestionCount,
} from "@/lib/interview/competency-round";
import { suggestCompetencySet } from "@/lib/meaning/suggest-competency-set";

describe("session-limits time budget", () => {
  it("clamps to allowed options", () => {
    expect(clampTimeBudgetMinutes(20)).toBe(20);
    expect(clampTimeBudgetMinutes(15)).toBe(20);
    expect(TIME_BUDGET_MINUTES_OPTIONS).toEqual([10, 20, 30]);
  });

  it("splits 20 minutes across 3 competencies", () => {
    expect(questionsPerCompetencyForRound(20, 3)).toBe(3);
  });

  it("gives at least one question per competency for 10 minutes", () => {
    expect(questionsPerCompetencyForRound(10, 4)).toBeGreaterThanOrEqual(1);
  });
});

describe("competency-round", () => {
  it("normalizes round order with focus first", () => {
    expect(
      normalizeRoundCompetencies("COMMUNICATION", ["ORG_FIT", "COMMUNICATION"]),
    ).toEqual(["COMMUNICATION", "ORG_FIT"]);
  });

  it("prefers time budget over question count", () => {
    expect(
      resolveRoundQuestionCount({
        timeBudgetMinutes: 30,
        questionCount: 1,
        roundSize: 3,
      }),
    ).toBe(4);
  });

  it("builds round brief text from feedback rows", () => {
    const brief = buildRoundBriefFromFeedbacks(
      [
        {
          competency: "COMMUNICATION",
          strengths: ["구조가 명확함"],
          improvements: ["수치 보강 필요"],
          summary: "",
        },
      ],
      { competencies: ["COMMUNICATION"], timeBudgetMinutes: 20, prepMode: "COMPETENCY_SET" },
    );
    expect(brief.strengthBullets[0]).toContain("구조가 명확함");
    expect(brief.improvementBullets[0]).toContain("수치 보강");
  });
});

describe("suggest-competency-set", () => {
  it("returns persona focus for competency set mode", () => {
    const set = suggestCompetencySet({
      prepMode: "COMPETENCY_SET",
      personaFocus: ["COMMUNICATION", "PROBLEM_SOLVING", "ORG_FIT"],
      meaningGraphScores: [],
    });
    expect(set.length).toBe(3);
    expect(set[0]).toBe("COMMUNICATION");
  });
});

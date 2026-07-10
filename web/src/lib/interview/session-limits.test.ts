import { describe, expect, it } from "vitest";
import {
  clampQuestionCount,
  DEFAULT_QUESTION_COUNT,
  sessionItemLimits,
} from "./session-limits";

describe("session-limits", () => {
  it("clamps question count to 1~5", () => {
    expect(clampQuestionCount(0)).toBe(1);
    expect(clampQuestionCount(6)).toBe(5);
    expect(clampQuestionCount(3)).toBe(3);
    expect(clampQuestionCount(undefined)).toBe(DEFAULT_QUESTION_COUNT);
  });

  it("uses fixed min=max for session item limits", () => {
    expect(sessionItemLimits(4)).toEqual({ minItems: 4, maxItems: 4, questionCount: 4 });
  });
});

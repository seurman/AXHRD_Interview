import { describe, expect, it } from "vitest";
import { matchKeywords } from "./resume-review";

describe("matchKeywords", () => {
  it("computes match score with partial token overlap", () => {
    const result = matchKeywords(
      ["React", "TypeScript", "협업"],
      ["react", "Python", "의사소통"]
    );
    expect(result.matchScore).toBeGreaterThan(0);
    expect(result.matched.some((m) => m.toLowerCase().includes("react"))).toBe(true);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("returns null score when required list is empty", () => {
    expect(matchKeywords(["a"], [])).toEqual({
      matchScore: null,
      matched: [],
      missing: [],
    });
  });
});

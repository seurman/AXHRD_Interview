import { describe, expect, it } from "vitest";
import {
  findSubstringHits,
  pickGraphRecommendation,
  tokenizeJdTerms,
} from "@/lib/meaning/jd-competency-match";

describe("jd-competency-match", () => {
  it("tokenizeJdTerms extracts Korean tokens", () => {
    const terms = tokenizeJdTerms("리더십과 커뮤니케이션 능력이 중요합니다", ["협업"]);
    expect(terms).toContain("리더십과");
    expect(terms).toContain("커뮤니케이션");
    expect(terms).toContain("협업");
  });

  it("findSubstringHits matches Korean phrases in full text", () => {
    const hits = findSubstringHits("팀 리더십과 협업이 중요합니다", ["리더십", "협업"]);
    expect(hits).toContain("리더십");
    expect(hits).toContain("협업");
  });

  it("pickGraphRecommendation requires clear winner", () => {
    const pick = pickGraphRecommendation([
      { code: "LEADERSHIP", label: "리더십", score: 1.2, matchedSignals: ["ncs:리더십"] },
      { code: "COMMUNICATION", label: "의사소통", score: 0.4, matchedSignals: [] },
    ]);
    expect(pick?.code).toBe("LEADERSHIP");

    const weak = pickGraphRecommendation([
      { code: "LEADERSHIP", label: "리더십", score: 0.2, matchedSignals: [] },
      { code: "COMMUNICATION", label: "의사소통", score: 0.18, matchedSignals: [] },
    ]);
    expect(weak).toBeNull();
  });
});

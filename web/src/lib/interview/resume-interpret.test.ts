import { describe, expect, it } from "vitest";
import { interpretResumeFast, needsEnrichment } from "@/lib/interview/resume-interpret";
import { matchClaimsToJd, recommendNextCompetencies } from "@/lib/neo4j/graph-analytics";

describe("interpretResumeFast", () => {
  it("returns claim evidence without LLM", () => {
    const summary = interpretResumeFast(
      "팀 발표로 설득했습니다. 문제를 분석해 처리 시간을 30% 단축했습니다. 동료와 협업했습니다.",
    );
    expect(summary.interpretMode).toBe("fast");
    expect(summary.evidence?.length).toBeGreaterThan(0);
    expect(needsEnrichment(summary)).toBe(true);
  });
});

describe("graph-analytics helpers", () => {
  it("recommends incomplete or weak competencies", () => {
    const recs = recommendNextCompetencies({
      performances: [
        { code: "COMMUNICATION", status: "COMPLETED", levelEst: 4 },
        { code: "PROBLEM_SOLVING", status: "NOT_STARTED", levelEst: null },
      ],
      limit: 2,
    });
    expect(recs.some((r) => r.code === "PROBLEM_SOLVING")).toBe(true);
  });

  it("matches JD terms to claims", () => {
    const hits = matchClaimsToJd({
      jdText: "데이터 분석 커뮤니케이션",
      evidence: [
        {
          claimId: "1",
          title: "분석",
          text: "데이터 분석을 통해 인사이트를 도출했습니다.",
          competencies: [{ code: "PROBLEM_SOLVING", score: 0.8 }],
        },
      ],
    });
    expect(hits[0]?.matchedTerms.length).toBeGreaterThan(0);
  });
});

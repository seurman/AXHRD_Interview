import { describe, expect, it } from "vitest";
import {
  buildResumeEvidence,
  ensureResumeEvidence,
  evidenceGaps,
  performanceBand,
  rankEvidenceForCompetency,
} from "@/lib/interview/resume-evidence";
import type { ResumeSummary } from "@/lib/interview/resume-summary";

const sample: ResumeSummary = {
  summary: "마케팅 인턴으로 캠페인 성과를 개선한 경험이 있습니다.",
  skills: ["마케팅", "데이터 분석"],
  experiences: [
    "팀 프로젝트에서 발표를 주도해 이해관계자를 설득했습니다.",
    "매출 20% 개선을 위해 문제를 분석하고 해결책을 실행했습니다.",
  ],
  keywords: ["마케팅"],
  chunks: [
    {
      title: "캠페인",
      markdown: "데이터 분석으로 원인을 찾고 팀과 협업해 성과를 냈습니다.",
      tags: ["분석"],
    },
  ],
};

describe("resume-evidence", () => {
  it("builds claim→competency links", () => {
    const evidence = buildResumeEvidence(sample);
    expect(evidence.length).toBeGreaterThan(0);
    const codes = new Set(evidence.flatMap((e) => e.competencies.map((c) => c.code)));
    expect(codes.has("COMMUNICATION") || codes.has("PROBLEM_SOLVING")).toBe(true);
  });

  it("ranks claims for competency with weak performance preferring metrics", () => {
    const evidence = ensureResumeEvidence(sample).evidence!;
    const ranked = rankEvidenceForCompetency(evidence, "PROBLEM_SOLVING", {
      code: "PROBLEM_SOLVING",
      levelEst: 1,
    });
    expect(ranked[0].text).toMatch(/20%|문제|분석/);
  });

  it("reports evidence gaps", () => {
    const gaps = evidenceGaps(buildResumeEvidence(sample));
    expect(gaps.length).toBe(6);
    expect(gaps[0].strength).toBeLessThanOrEqual(gaps[gaps.length - 1].strength);
  });

  it("maps performance bands", () => {
    expect(performanceBand({ code: "X", levelEst: 1 })).toBe("weak");
    expect(performanceBand({ code: "X", levelEst: 4 })).toBe("strong");
    expect(performanceBand({ code: "X", levelEst: 3 })).toBe("mid");
  });
});

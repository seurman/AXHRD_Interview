import { describe, expect, it } from "vitest";
import {
  buildEvidenceParagraphFeedback,
  extractQuoteCandidates,
  type CriterionResult,
  type JdMatchResult,
} from "@/lib/interview/resume-review";
import type { ResumeSummary } from "@/lib/interview/resume-summary";

const sampleRaw = `
서버 응답 지연 이슈를 맡았을 때, 무작정 증설하기보다 원인을 먼저 좁히기로 했습니다.
APM으로 병목 구간을 측정한 결과, 특정 쿼리가 전체 응답 시간의 60% 이상을 차지하는 것을 확인했습니다.
인덱스를 재구성하고 캐시 계층(Redis)을 도입한 결과, 평균 응답 시간이 420ms에서 95ms로 약 77% 단축되었습니다.
이 경험을 바탕으로 장애 대응보다 원인 분석과 측정 기반 개선을 우선하는 습관을 갖게 되었습니다.
지원 동기로는 사용자가 체감하는 성능이 곧 신뢰라고 믿기 때문입니다.
입사 후에는 관측 가능성과 배포 안정성을 높이는 일에 기여하고 싶습니다.
`.trim();

const summary: ResumeSummary = {
  summary: "성능 개선 경험이 있는 백엔드 지원자",
  skills: ["APM", "Redis"],
  experiences: [
    "APM으로 병목을 측정해 특정 쿼리가 응답 시간의 60%를 차지함을 확인했다.",
    "인덱스 재구성과 Redis 도입으로 응답 시간을 420ms에서 95ms로 줄였다.",
  ],
  keywords: ["성능", "캐시"],
  chunks: [],
};

describe("resume-review feedback quality", () => {
  it("extracts diverse quote candidates from raw text", () => {
    const quotes = extractQuoteCandidates(sampleRaw, summary);
    expect(quotes.length).toBeGreaterThanOrEqual(4);
    const keys = new Set(quotes.map((q) => q.slice(0, 40)));
    expect(keys.size).toBe(quotes.length);
  });

  it("does not reuse the same quote across paragraph feedback", () => {
    const quotes = extractQuoteCandidates(sampleRaw, summary);
    const results: CriterionResult[] = [
      {
        code: "TOPIC_FIRST",
        category: "FORMAT_LOGIC",
        title: "두괄식",
        status: "partial",
        strengthNote: "",
        gapNote: "첫 문장에 성과를 두세요.",
      },
      {
        code: "LOGICAL_ARC",
        category: "FORMAT_LOGIC",
        title: "논리 흐름",
        status: "fail",
        strengthNote: "",
        gapNote: "직무 연결 문장이 필요합니다.",
      },
      {
        code: "OWN_ROLE_CLEAR",
        category: "FORMAT_LOGIC",
        title: "본인 역할",
        status: "partial",
        strengthNote: "",
        gapNote: "역할을 더 분명히 쓰세요.",
      },
      {
        code: "JD_KEYWORD_EVIDENCE",
        category: "INDUSTRY_FIT",
        title: "키워드 근거",
        status: "fail",
        strengthNote: "",
        gapNote: "직무 언어로 번역하세요.",
      },
      {
        code: "JOB_RELEVANT_EXPERIENCE",
        category: "INDUSTRY_FIT",
        title: "직무 경험",
        status: "partial",
        strengthNote: "",
        gapNote: "관련 경험을 앞에 두세요.",
      },
    ];

    const jdMatch: JdMatchResult = {
      matchScore: 20,
      matched: [],
      missing: ["문제해결", "협업"],
    };

    const items = buildEvidenceParagraphFeedback(results, quotes, {
      signals: {
        hasMetrics: true,
        metricHits: ["77%"],
        hasVagueEffort: false,
        hasSituationCues: true,
        hasTaskCues: true,
        hasActionCues: true,
        hasResultCues: true,
        hasFirstPersonAction: true,
        hasTopicFirst: false,
        hasJobLink: false,
        hasMotivationLink: true,
        textLength: 800,
        openingSnippet: "서버 응답",
      },
      jdMatch,
      matchSource: "industry_preset",
      industryLabel: "IT",
      jobRoleLabel: "백엔드",
      requiredKeywords: ["문제해결"],
      quotes,
    });

    expect(items.length).toBeGreaterThanOrEqual(3);
    const unique = new Set(items.map((i) => i.quote.slice(0, 50)));
    expect(unique.size).toBe(items.length);
    for (const item of items) {
      expect(item.issue).not.toMatch(/원문 기준으로 추가 보완/);
      expect(item.suggestion.length).toBeGreaterThan(20);
    }
  });
});

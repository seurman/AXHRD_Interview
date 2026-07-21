import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  heuristicPersonalize,
  personalizeQuestion,
} from "./personalize-question";

describe("heuristicPersonalize", () => {
  it("quotes a concrete episode instead of appending a generic bank template", () => {
    const q = heuristicPersonalize({
      highlights: [
        "팀 일정 충돌로 데모가 이틀 밀렸을 때 역할 재분배와 일일 체크인을 제안했다",
      ],
      competency: "ORG_FIT",
    });
    expect(q).toContain("「");
    expect(q).toContain("역할 재분배");
    expect(q).toContain("—");
    expect(q).not.toContain("경험을 바탕으로 여쭤봅니다");
    expect(q).not.toContain("의견 충돌 상황에서");
  });

  it("asks a problem-solving probe when competency is PROBLEM_SOLVING", () => {
    const q = heuristicPersonalize({
      highlights: ["결제 대기열 병목 75%를 0.8초로 줄였다"],
      competency: "PROBLEM_SOLVING",
    });
    expect(q).toMatch(/병목|지표|원인|검증/);
    expect(q).toContain("75%");
  });
});

describe("personalizeQuestion", () => {
  const prevKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = prevKey;
  });

  it("grounds the question in resume experiences without generic filler", async () => {
    const result = await personalizeQuestion({
      template: "의견 충돌 상황에서 상대를 설득했던 경험을 말씀해 주세요.",
      competency: "ORG_FIT",
      resumeSummary: {
        summary: "협업 갈등 해결 경험",
        skills: ["협업"],
        keywords: ["팀"],
        experiences: [
          "팀 일정 충돌로 데모가 이틀 밀렸을 때 역할 재분배와 일일 체크인을 제안해 일정을 회복했다",
        ],
        chunks: [],
      },
    });

    expect(result.text).toContain("역할 재분배");
    expect(result.text).toContain("「");
    expect(result.text).not.toContain("경험을 바탕으로 여쭤봅니다");
    expect(result.text).not.toMatch(/의견 충돌 상황에서 상대를 설득했던 경험을 말씀해 주세요/);
    expect(result.resumeAnchors?.length).toBeGreaterThan(0);
  });
});

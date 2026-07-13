import { describe, expect, it, vi, beforeEach } from "vitest";
import { filterAndRankQuestionPool, type PoolQuestion } from "@/lib/interview/question-pool";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    responseRecord: { findMany: vi.fn() },
    interviewSession: { count: vi.fn() },
  },
}));

const baseQuestions: PoolQuestion[] = [
  {
    id: "q1",
    externalId: "COMM-L1-001",
    level: 1,
    difficulty: -2,
    discrimination: 1,
    template: "팀 프로젝트에서 의견을 조율한 경험을 말씀해 주세요.",
    competency: { code: "COMMUNICATION" },
  },
  {
    id: "q2",
    externalId: "COMM-L1-002",
    level: 1,
    difficulty: -1.5,
    discrimination: 1,
    template: "발표 자료를 준비해 전달한 경험이 있나요?",
    competency: { code: "COMMUNICATION" },
  },
  {
    id: "q3",
    externalId: "COMM-L2-001",
    level: 2,
    difficulty: -1,
    discrimination: 1.1,
    template: "마케팅 캠페인 보고서를 작성한 경험을 말씀해 주세요.",
    competency: { code: "COMMUNICATION" },
  },
  {
    id: "q4",
    externalId: "COMM-L2-002",
    level: 2,
    difficulty: -0.5,
    discrimination: 1.1,
    template: "고객 요구를 파악해 대응한 경험이 있나요?",
    competency: { code: "COMMUNICATION" },
  },
];

describe("filterAndRankQuestionPool", () => {
  beforeEach(() => {
    vi.mocked(prisma.interviewSession.count).mockResolvedValue(4);
    vi.mocked(prisma.responseRecord.findMany).mockResolvedValue([]);
  });

  it("이미 답한 문항(최근·고득점)은 풀에서 제외한다", async () => {
    vi.mocked(prisma.responseRecord.findMany).mockResolvedValue([
      {
        questionId: "q1",
        rubricScore: 0.8,
        session: { sessionNumber: 3 },
      },
    ] as never);

    const pool = await filterAndRankQuestionPool({
      userId: "user-1",
      competency: "COMMUNICATION",
      questions: baseQuestions,
    });

    expect(pool.find((q) => q.id === "q1")).toBeUndefined();
    expect(pool.length).toBeGreaterThan(0);
  });

  it("저점수 문항은 3세션 이후 다시 포함할 수 있다", async () => {
    vi.mocked(prisma.interviewSession.count).mockResolvedValue(6);
    vi.mocked(prisma.responseRecord.findMany).mockResolvedValue([
      {
        questionId: "q2",
        rubricScore: 0.3,
        session: { sessionNumber: 2 },
      },
    ] as never);

    const pool = await filterAndRankQuestionPool({
      userId: "user-1",
      competency: "COMMUNICATION",
      questions: baseQuestions,
    });

    expect(pool.find((q) => q.id === "q2")).toBeDefined();
  });

  it("저점수라도 3세션 미만이면 제외한다", async () => {
    vi.mocked(prisma.interviewSession.count).mockResolvedValue(4);
    vi.mocked(prisma.responseRecord.findMany).mockResolvedValue([
      {
        questionId: "q2",
        rubricScore: 0.3,
        session: { sessionNumber: 3 },
      },
    ] as never);

    const pool = await filterAndRankQuestionPool({
      userId: "user-1",
      competency: "COMMUNICATION",
      questions: baseQuestions,
    });

    expect(pool.find((q) => q.id === "q2")).toBeUndefined();
  });

  it("자소서 키워드와 연관 높은 문항을 같은 레벨에서 우선한다", async () => {
    const pool = await filterAndRankQuestionPool({
      userId: "user-1",
      competency: "COMMUNICATION",
      questions: baseQuestions,
      resumeSummary: {
        summary: "마케팅 보고서 작성 경험",
        skills: ["마케팅"],
        experiences: ["캠페인 보고서 작성"],
        keywords: ["보고서"],
        chunks: [],
      },
      jobRole: "MARKETING",
    });

    const level2 = pool.filter((q) => q.level === 2);
    expect(level2[0]?.template).toMatch(/마케팅|보고서/);
  });
});

/** 문항별 실측 응답 성과 — ResponseRecord 기반 (표시용) */

export type QuestionPerformanceFlag =
  | "표본부족"
  | "너무쉬움"
  | "너무어려움_모호함"
  | "정상";

export type QuestionPerformanceStats = {
  sampleSize: number;
  avgRubricScore: number;
  scoreDistribution: { low: number; mid: number; high: number };
  followUpRate: number;
  flag: QuestionPerformanceFlag;
};

export const QUESTION_PERF_MIN_SAMPLE = 10;
const EASY_AVG_THRESHOLD = 0.85;
const HARD_AVG_THRESHOLD = 0.35;
const HIGH_FOLLOW_UP_RATE = 0.5;

type ResponseRow = {
  rubricScore: number;
  followUpQuestion: string | null;
  followUpTranscript: string | null;
};

type ResponseRowWithQuestionId = ResponseRow & { questionId: string };

export function flagQuestionPerformance(
  stats: Pick<QuestionPerformanceStats, "sampleSize" | "avgRubricScore" | "followUpRate">,
): QuestionPerformanceFlag {
  if (stats.sampleSize < QUESTION_PERF_MIN_SAMPLE) return "표본부족";
  if (stats.avgRubricScore > EASY_AVG_THRESHOLD) return "너무쉬움";
  if (stats.avgRubricScore < HARD_AVG_THRESHOLD || stats.followUpRate > HIGH_FOLLOW_UP_RATE) {
    return "너무어려움_모호함";
  }
  return "정상";
}

export function emptyQuestionPerformance(): QuestionPerformanceStats {
  return {
    sampleSize: 0,
    avgRubricScore: 0,
    scoreDistribution: { low: 0, mid: 0, high: 0 },
    followUpRate: 0,
    flag: "표본부족",
  };
}

export function computeQuestionPerformanceFromRows(rows: ResponseRow[]): QuestionPerformanceStats {
  if (rows.length === 0) return emptyQuestionPerformance();

  let sum = 0;
  let low = 0;
  let mid = 0;
  let high = 0;
  let followUps = 0;

  for (const r of rows) {
    sum += r.rubricScore;
    if (r.rubricScore < 0.4) low += 1;
    else if (r.rubricScore <= 0.7) mid += 1;
    else high += 1;
    if (r.followUpQuestion && r.followUpTranscript) followUps += 1;
  }

  const n = rows.length;
  const stats = {
    sampleSize: n,
    avgRubricScore: sum / n,
    scoreDistribution: { low, mid, high },
    followUpRate: followUps / n,
  };

  return {
    ...stats,
    flag: flagQuestionPerformance(stats),
  };
}

export async function loadQuestionPerformanceByIds(
  questionIds: string[],
  loadResponses: (ids: string[]) => Promise<ResponseRowWithQuestionId[]> = defaultLoadResponses,
): Promise<Map<string, QuestionPerformanceStats>> {
  const result = new Map<string, QuestionPerformanceStats>();
  for (const id of questionIds) {
    result.set(id, emptyQuestionPerformance());
  }
  if (questionIds.length === 0) return result;

  const responses = await loadResponses(questionIds);
  const groups = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const list = groups.get(r.questionId) ?? [];
    list.push({
      rubricScore: r.rubricScore,
      followUpQuestion: r.followUpQuestion,
      followUpTranscript: r.followUpTranscript,
    });
    groups.set(r.questionId, list);
  }

  for (const id of questionIds) {
    result.set(id, computeQuestionPerformanceFromRows(groups.get(id) ?? []));
  }
  return result;
}

async function defaultLoadResponses(questionIds: string[]): Promise<ResponseRowWithQuestionId[]> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.responseRecord.findMany({
    where: {
      isBonusQuestion: false,
      questionId: { in: questionIds },
    },
    select: {
      questionId: true,
      rubricScore: true,
      followUpQuestion: true,
      followUpTranscript: true,
    },
  }).then((rows) =>
    rows
      .filter((r): r is typeof r & { questionId: string } => r.questionId !== null)
      .map((r) => ({
        questionId: r.questionId,
        rubricScore: r.rubricScore,
        followUpQuestion: r.followUpQuestion,
        followUpTranscript: r.followUpTranscript,
      })),
  );
}

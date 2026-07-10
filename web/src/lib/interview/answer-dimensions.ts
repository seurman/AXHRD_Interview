/** 답변 직후·역량 완료 리포트에서 공통으로 쓰는 4축 인사이트 */

export type AnswerDimensions = {
  starStructure: number;
  questionIntent: number;
  logic: number;
  delivery: number;
};

export type AnswerDimensionKey = keyof AnswerDimensions;

export const ANSWER_DIMENSION_KEYS: AnswerDimensionKey[] = [
  "starStructure",
  "questionIntent",
  "logic",
  "delivery",
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function normalizeAnswerDimensions(raw: unknown): AnswerDimensions | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (
    typeof o.starStructure === "number" &&
    typeof o.questionIntent === "number" &&
    typeof o.logic === "number" &&
    typeof o.delivery === "number"
  ) {
    return {
      starStructure: clamp01(o.starStructure),
      questionIntent: clamp01(o.questionIntent),
      logic: clamp01(o.logic),
      delivery: clamp01(o.delivery),
    };
  }

  if (
    typeof o.structure === "number" ||
    typeof o.specificity === "number" ||
    typeof o.relevance === "number" ||
    typeof o.clarity === "number"
  ) {
    return {
      starStructure: clamp01(typeof o.structure === "number" ? o.structure : 0.5),
      questionIntent: clamp01(typeof o.relevance === "number" ? o.relevance : 0.5),
      logic: clamp01(typeof o.specificity === "number" ? o.specificity : 0.5),
      delivery: clamp01(typeof o.clarity === "number" ? o.clarity : 0.5),
    };
  }

  return null;
}

/** 역량 완료 리포트용 0~100 스케일 */
export type CompetencyReportDimensions = {
  starStructure: number;
  questionIntent: number;
  logic: number;
  delivery: number;
};

export function normalizeCompetencyDimensions(raw: unknown): CompetencyReportDimensions | null {
  const normalized = normalizeAnswerDimensions(raw);
  if (!normalized) return null;
  return {
    starStructure: Math.round(normalized.starStructure * 100),
    questionIntent: Math.round(normalized.questionIntent * 100),
    logic: Math.round(normalized.logic * 100),
    delivery: Math.round(normalized.delivery * 100),
  };
}

export function findWeakestDimension(d: AnswerDimensions): AnswerDimensionKey {
  let weakest: AnswerDimensionKey = "starStructure";
  let min = Infinity;
  for (const key of ANSWER_DIMENSION_KEYS) {
    if (d[key] < min) {
      min = d[key];
      weakest = key;
    }
  }
  return weakest;
}

export function averageDimensions(history: AnswerDimensions[]): AnswerDimensions | null {
  if (history.length === 0) return null;
  const sum: AnswerDimensions = {
    starStructure: 0,
    questionIntent: 0,
    logic: 0,
    delivery: 0,
  };
  for (const d of history) {
    for (const key of ANSWER_DIMENSION_KEYS) {
      sum[key] += d[key];
    }
  }
  const n = history.length;
  return {
    starStructure: sum.starStructure / n,
    questionIntent: sum.questionIntent / n,
    logic: sum.logic / n,
    delivery: sum.delivery / n,
  };
}

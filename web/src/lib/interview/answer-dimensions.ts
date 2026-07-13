/** 답변 직후·역량 완료 리포트에서 공통으로 쓰는 6축 인사이트 (BEI 타당도 기반) */

export type AnswerDimensions = {
  questionIntent: number;
  situationSpecificity: number;
  individualOwnership: number;
  logic: number;
  outcomeQuantification: number;
  delivery: number;
};

export type AnswerDimensionKey = keyof AnswerDimensions;

export const ANSWER_DIMENSION_KEYS: AnswerDimensionKey[] = [
  "questionIntent",
  "situationSpecificity",
  "individualOwnership",
  "logic",
  "outcomeQuantification",
  "delivery",
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function normalizeAnswerDimensions(raw: unknown): AnswerDimensions | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  // 1) 신규 6축 형태
  if (
    typeof o.questionIntent === "number" &&
    typeof o.situationSpecificity === "number" &&
    typeof o.individualOwnership === "number" &&
    typeof o.logic === "number" &&
    typeof o.outcomeQuantification === "number" &&
    typeof o.delivery === "number"
  ) {
    return {
      questionIntent: clamp01(o.questionIntent),
      situationSpecificity: clamp01(o.situationSpecificity),
      individualOwnership: clamp01(o.individualOwnership),
      logic: clamp01(o.logic),
      outcomeQuantification: clamp01(o.outcomeQuantification),
      delivery: clamp01(o.delivery),
    };
  }

  // 2) 구버전 4축(starStructure 포함) — 오늘 이전에 저장된 실제 데이터용 하위호환.
  //    starStructure 하나였던 값을 situationSpecificity/individualOwnership/
  //    outcomeQuantification 세 곳에 동일하게 복제한다(구버전은 이 셋을 구분하지
  //    않았으니 근사치 폴백 — 완벽한 재현이 아니라 값이 아예 없는 것보다 낫다).
  if (
    typeof o.starStructure === "number" &&
    typeof o.questionIntent === "number" &&
    typeof o.logic === "number" &&
    typeof o.delivery === "number"
  ) {
    const s = clamp01(o.starStructure);
    return {
      questionIntent: clamp01(o.questionIntent),
      situationSpecificity: s,
      individualOwnership: s,
      outcomeQuantification: s,
      logic: clamp01(o.logic),
      delivery: clamp01(o.delivery),
    };
  }

  // 3) 더 오래된 대체키(structure/specificity/relevance/clarity)
  if (
    typeof o.structure === "number" ||
    typeof o.specificity === "number" ||
    typeof o.relevance === "number" ||
    typeof o.clarity === "number"
  ) {
    const structure = typeof o.structure === "number" ? o.structure : 0.5;
    const specificity = typeof o.specificity === "number" ? o.specificity : 0.5;
    return {
      questionIntent: clamp01(typeof o.relevance === "number" ? o.relevance : 0.5),
      situationSpecificity: clamp01(structure),
      individualOwnership: clamp01(specificity),
      logic: clamp01(specificity),
      outcomeQuantification: clamp01(structure),
      delivery: clamp01(typeof o.clarity === "number" ? o.clarity : 0.5),
    };
  }

  return null;
}

/** 역량 완료 리포트용 0~100 스케일 */
export type CompetencyReportDimensions = {
  questionIntent: number;
  situationSpecificity: number;
  individualOwnership: number;
  logic: number;
  outcomeQuantification: number;
  delivery: number;
};

export function normalizeCompetencyDimensions(raw: unknown): CompetencyReportDimensions | null {
  const normalized = normalizeAnswerDimensions(raw);
  if (!normalized) return null;
  return {
    questionIntent: Math.round(normalized.questionIntent * 100),
    situationSpecificity: Math.round(normalized.situationSpecificity * 100),
    individualOwnership: Math.round(normalized.individualOwnership * 100),
    logic: Math.round(normalized.logic * 100),
    outcomeQuantification: Math.round(normalized.outcomeQuantification * 100),
    delivery: Math.round(normalized.delivery * 100),
  };
}

export function findWeakestDimension(d: AnswerDimensions): AnswerDimensionKey {
  let weakest: AnswerDimensionKey = ANSWER_DIMENSION_KEYS[0];
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
  const sum = Object.fromEntries(
    ANSWER_DIMENSION_KEYS.map((key) => [key, 0]),
  ) as AnswerDimensions;
  for (const d of history) {
    for (const key of ANSWER_DIMENSION_KEYS) {
      sum[key] += d[key];
    }
  }
  const n = history.length;
  return Object.fromEntries(
    ANSWER_DIMENSION_KEYS.map((key) => [key, sum[key] / n]),
  ) as AnswerDimensions;
}

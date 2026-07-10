/** 역량당 문항 수 — 피면접자가 1~5 중 선택 */
export const QUESTION_COUNT_MIN = 1;
export const QUESTION_COUNT_MAX = 5;
export const DEFAULT_QUESTION_COUNT = 3;

/** @deprecated 고정 개수 선택으로 대체 — 하위 호환 참조용 */
export const COMPETENCY_SESSION_MIN_ITEMS = DEFAULT_QUESTION_COUNT;
/** @deprecated 고정 개수 선택으로 대체 — 하위 호환 참조용 */
export const COMPETENCY_SESSION_MAX_ITEMS = QUESTION_COUNT_MAX;

/** FULL 모드(현재 미사용) */
export const FULL_SESSION_MIN_ITEMS = 8;
export const FULL_SESSION_MAX_ITEMS = 18;

/** JD 보너스 질문 — 은행 문항 FK 없이 respond API에서 식별 */
export const BONUS_QUESTION_ID = "__bonus_jd__";

export function clampQuestionCount(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_QUESTION_COUNT;
  return Math.min(QUESTION_COUNT_MAX, Math.max(QUESTION_COUNT_MIN, Math.round(n)));
}

/** 선택한 문항 수만큼 정확히 종료 (min = max) */
export function sessionItemLimits(questionCount: unknown): {
  minItems: number;
  maxItems: number;
  questionCount: number;
} {
  const count = clampQuestionCount(questionCount);
  return { minItems: count, maxItems: count, questionCount: count };
}

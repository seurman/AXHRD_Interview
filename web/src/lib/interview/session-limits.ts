/** 역량당 문항 수 — 피면접자가 1~5 중 선택 (시간 예산 미사용 시) */
export const QUESTION_COUNT_MIN = 1;
export const QUESTION_COUNT_MAX = 5;
export const DEFAULT_QUESTION_COUNT = 3;

/** 면접 전 선택 가능한 총 시간 예산(분) */
export const TIME_BUDGET_MINUTES_OPTIONS = [10, 20, 30] as const;
export type TimeBudgetMinutes = (typeof TIME_BUDGET_MINUTES_OPTIONS)[number];
export const DEFAULT_TIME_BUDGET_MINUTES: TimeBudgetMinutes = 20;
/** 문항 1개당 예상 소요 시간(분) — 시간 예산 → 문항 수 환산 */
export const MINUTES_PER_QUESTION_ESTIMATE = 2.5;

/** @deprecated 고정 개수 선택으로 대체 — 하위 호환 참조용 */
export const COMPETENCY_SESSION_MIN_ITEMS = DEFAULT_QUESTION_COUNT;
/** @deprecated 고정 개수 선택으로 대체 — 하위 호환 참조용 */
export const COMPETENCY_SESSION_MAX_ITEMS = QUESTION_COUNT_MAX;

/** FULL 모드(현재 미사용) */
export const FULL_SESSION_MIN_ITEMS = 8;
export const FULL_SESSION_MAX_ITEMS = 18;

/** JD 보너스 질문 — 은행 문항 FK 없이 respond API에서 식별 */
export const BONUS_QUESTION_ID = "__bonus_jd__";

/** 자소서 경험 확인 보너스 질문 — 은행에 없는 즉석 질문(IRT 미포함) */
export const CLAIM_QUESTION_ID = "__bonus_resume_claim__";

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

export function clampTimeBudgetMinutes(value: unknown): TimeBudgetMinutes {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (TIME_BUDGET_MINUTES_OPTIONS.includes(n as TimeBudgetMinutes)) {
    return n as TimeBudgetMinutes;
  }
  return DEFAULT_TIME_BUDGET_MINUTES;
}

/** 차수 전체 시간 예산을 역량 수로 나눠 역량당 문항 수를 산출 */
export function questionsPerCompetencyForRound(
  timeBudgetMinutes: TimeBudgetMinutes,
  competencyCount: number,
): number {
  const count = Math.max(1, competencyCount);
  const totalQuestions = Math.max(
    count,
    Math.min(
      count * QUESTION_COUNT_MAX,
      Math.round(timeBudgetMinutes / MINUTES_PER_QUESTION_ESTIMATE),
    ),
  );
  return clampQuestionCount(Math.ceil(totalQuestions / count));
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

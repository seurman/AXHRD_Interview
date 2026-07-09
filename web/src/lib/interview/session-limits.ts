/** COMPETENCY 모드(실사용) — start-session.ts와 respond/route.ts가 반드시 동일 값을 써야 한다. */
export const COMPETENCY_SESSION_MIN_ITEMS = 3;
export const COMPETENCY_SESSION_MAX_ITEMS = 5;

/** FULL 모드(현재 미사용) */
export const FULL_SESSION_MIN_ITEMS = 8;
export const FULL_SESSION_MAX_ITEMS = 18;

/** JD 보너스 질문 — 은행 문항 FK 없이 respond API에서 식별 */
export const BONUS_QUESTION_ID = "__bonus_jd__";

import type { PlanTier } from "@prisma/client";

/** 전체 IRT 문항뱅크 접근 — FREE는 쇼케이스만 */
export function canAccessFullQuestionBank(planTier: PlanTier): boolean {
  return (
    planTier === "INDIVIDUAL_PRO" ||
    planTier === "ORG_STANDARD" ||
    planTier === "ORG_ENTERPRISE"
  );
}

/** Prisma where 절에 병합할 문항 접근 필터 */
export function questionBankAccessWhere(planTier: PlanTier): { isShowcase?: boolean } {
  if (canAccessFullQuestionBank(planTier)) return {};
  return { isShowcase: true };
}

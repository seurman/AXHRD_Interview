import type { PlanTier } from "@prisma/client";
import type { RoleUser } from "@/lib/auth/roles";

export type PersonalAccessContext = {
  billingTier?: PlanTier;
};

/** 비로그인 방문자 — 계정 없이 공개 체험만 가능 */
export function isGuestVisitor(user: RoleUser | null | undefined): boolean {
  return !user;
}

/**
 * 비로그인 방문자 여부 (레거시 이름 유지).
 * 로그인한 FREE 사용자는 false — 월 3회 한도는 checkUsageLimit()으로만 제어.
 */
export function isPersonalTrialOnlyUser(
  user: RoleUser | null | undefined,
  _context: PersonalAccessContext = {},
): boolean {
  return isGuestVisitor(user);
}

export async function loadPersonalAccessContext(userId: string): Promise<PersonalAccessContext> {
  const { getBillingContext } = await import("@/lib/billing/subscription");
  const { planTier } = await getBillingContext(userId);
  return { billingTier: planTier };
}

/**
 * @deprecated FREE 로그인 사용자 차단 제거됨 — 항상 null 반환.
 * 비로그인 API는 라우트에서 getCurrentUser() null 체크로 처리.
 */
export async function blockPersonalTrialApi(_user: {
  id: string;
  email: string;
  platformRole?: string;
  organizationId?: string | null;
}): Promise<null> {
  return null;
}

import type { PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";
import { getBillingContext } from "@/lib/billing/subscription";
import { isUsageExemptUser, type RoleUser } from "@/lib/auth/roles";

export type PersonalAccessContext = {
  billingTier?: PlanTier;
};

/** 기관 미소속 · FREE 플랜 개인 사용자 — 5분 면접 체험(/demo)만 허용 */
export function isPersonalTrialOnlyUser(
  user: RoleUser,
  context: PersonalAccessContext = {},
): boolean {
  if (user.organizationId) return false;
  if (isUsageExemptUser(user)) return false;
  return (context.billingTier ?? "FREE") === "FREE";
}

export async function loadPersonalAccessContext(userId: string): Promise<PersonalAccessContext> {
  const { planTier } = await getBillingContext(userId);
  return { billingTier: planTier };
}

export async function blockPersonalTrialApi(user: {
  id: string;
  email: string;
  platformRole?: string;
  organizationId?: string | null;
}): Promise<NextResponse | null> {
  const context = await loadPersonalAccessContext(user.id);
  if (!isPersonalTrialOnlyUser(user, context)) return null;
  return NextResponse.json(
    {
      error: "무료 개인 계정은 5분 면접 체험만 이용할 수 있습니다.",
      code: "TRIAL_ONLY",
      redirect: "/demo",
    },
    { status: 403 },
  );
}

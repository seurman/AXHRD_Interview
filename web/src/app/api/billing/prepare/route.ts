import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { ORG_PLAN_TIERS, PLANS, SELF_SERVE_PLAN_TIERS } from "@/lib/billing/plans";
import { generateCustomerKey } from "@/lib/billing/subscription";
import { getTossClientKey } from "@/lib/billing/toss";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planTier = body.planTier as PlanTier | undefined;

  if (!planTier || !SELF_SERVE_PLAN_TIERS.includes(planTier)) {
    return NextResponse.json({ error: "유효하지 않은 플랜입니다." }, { status: 400 });
  }

  const plan = PLANS[planTier];
  if (plan.priceMonthlyKrw === null) {
    return NextResponse.json(
      { error: "이 플랜의 가격이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 400 }
    );
  }

  if (ORG_PLAN_TIERS.includes(planTier)) {
    if (!user.organizationId || user.orgRole !== "ADMIN") {
      return NextResponse.json(
        { error: "기관 플랜은 소속 기관 관리자만 구독할 수 있습니다." },
        { status: 403 }
      );
    }
  }

  const customerKey =
    ORG_PLAN_TIERS.includes(planTier) && user.organizationId
      ? generateCustomerKey("org", user.organizationId)
      : generateCustomerKey("user", user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    clientKey: getTossClientKey(),
    customerKey,
    planTier,
    amount: plan.priceMonthlyKrw,
    orderName: `HR_IN ${plan.nameKo} 구독`,
    successUrl: `${appUrl}/billing/success?planTier=${planTier}`,
    failUrl: `${appUrl}/billing/fail?planTier=${planTier}`,
  });
}

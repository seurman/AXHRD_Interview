import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ORG_PLAN_TIERS,
  PLANS,
  SELF_SERVE_PLAN_TIERS,
  clampSeatQuantity,
  resolvePlanChargeAmount,
} from "@/lib/billing/plans";
import { generateCustomerKey } from "@/lib/billing/subscription";
import { getTossClientKey } from "@/lib/billing/toss";
import { countOrgMembers } from "@/lib/org/contract";

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
  if (plan.priceMonthlyKrw === null && plan.pricePerSeatMonthlyKrw == null) {
    return NextResponse.json(
      { error: "이 플랜의 가격이 아직 설정되지 않았습니다. 잠시 후 다시 시도해 주세요." },
      { status: 400 },
    );
  }

  if (ORG_PLAN_TIERS.includes(planTier)) {
    if (!user.organizationId || user.orgRole !== "ADMIN") {
      return NextResponse.json(
        { error: "기관 플랜은 소속 기관 관리자만 구독할 수 있습니다." },
        { status: 403 },
      );
    }
  }

  let seatQuantity: number | null = null;
  if (ORG_PLAN_TIERS.includes(planTier)) {
    const members = await countOrgMembers(user.organizationId!);
    const raw = body.seatQuantity != null ? Number(body.seatQuantity) : plan.limits.orgMemberCap ?? 10;
    seatQuantity = clampSeatQuantity(planTier, raw);
    if (seatQuantity < members) {
      return NextResponse.json(
        { error: `현재 소속 ${members}명보다 적은 좌석(${seatQuantity})은 설정할 수 없습니다.` },
        { status: 400 },
      );
    }
  }

  const amount = resolvePlanChargeAmount(planTier, seatQuantity);
  if (amount == null || amount <= 0) {
    return NextResponse.json({ error: "결제 금액을 계산할 수 없습니다." }, { status: 400 });
  }

  const customerKey =
    ORG_PLAN_TIERS.includes(planTier) && user.organizationId
      ? generateCustomerKey("org", user.organizationId)
      : generateCustomerKey("user", user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const seatQs = seatQuantity != null ? `&seatQuantity=${seatQuantity}` : "";

  return NextResponse.json({
    clientKey: getTossClientKey(),
    customerKey,
    planTier,
    seatQuantity,
    amount,
    orderName:
      seatQuantity != null
        ? `HR_IN ${plan.nameKo} ${seatQuantity}석 구독`
        : `HR_IN ${plan.nameKo} 구독`,
    successUrl: `${appUrl}/billing/success?planTier=${planTier}${seatQs}`,
    failUrl: `${appUrl}/billing/fail?planTier=${planTier}`,
  });
}

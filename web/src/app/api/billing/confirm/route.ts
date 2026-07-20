import { NextResponse } from "next/server";
import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { chargeInitialSubscription } from "@/lib/billing/charge";
import {
  ORG_PLAN_TIERS,
  PLANS,
  SELF_SERVE_PLAN_TIERS,
  clampSeatQuantity,
} from "@/lib/billing/plans";
import {
  addBillingPeriod,
  generateCustomerKey,
} from "@/lib/billing/subscription";
import { issueBillingKey } from "@/lib/billing/toss";
import { countOrgMembers } from "@/lib/org/contract";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const authKey = typeof body.authKey === "string" ? body.authKey.trim() : "";
  const customerKey = typeof body.customerKey === "string" ? body.customerKey.trim() : "";
  const planTier = body.planTier as PlanTier | undefined;
  const rawSeats = body.seatQuantity != null ? Number(body.seatQuantity) : null;

  if (!authKey || !customerKey || !planTier) {
    return NextResponse.json({ error: "authKey, customerKey, planTier가 필요합니다." }, { status: 400 });
  }

  if (!SELF_SERVE_PLAN_TIERS.includes(planTier)) {
    return NextResponse.json({ error: "자동결제 대상 플랜이 아닙니다." }, { status: 400 });
  }

  const expectedKey =
    ORG_PLAN_TIERS.includes(planTier) && user.organizationId
      ? generateCustomerKey("org", user.organizationId)
      : generateCustomerKey("user", user.id);

  if (customerKey !== expectedKey) {
    return NextResponse.json({ error: "customerKey가 일치하지 않습니다." }, { status: 403 });
  }

  if (ORG_PLAN_TIERS.includes(planTier)) {
    if (!user.organizationId || user.orgRole !== "ADMIN") {
      return NextResponse.json({ error: "기관 관리자만 구독할 수 있습니다." }, { status: 403 });
    }
  }

  let seatQuantity: number | null = null;
  if (ORG_PLAN_TIERS.includes(planTier)) {
    const members = await countOrgMembers(user.organizationId!);
    seatQuantity = clampSeatQuantity(
      planTier,
      rawSeats ?? PLANS[planTier].limits.orgMemberCap ?? 10,
    );
    if (seatQuantity < members) {
      return NextResponse.json(
        { error: `현재 소속 ${members}명보다 적은 좌석으로 구독할 수 없습니다.` },
        { status: 400 },
      );
    }
  }

  let billingKey: string;
  try {
    const issued = await issueBillingKey({ authKey, customerKey });
    billingKey = issued.billingKey;
  } catch (e) {
    const message = e instanceof Error ? e.message : "빌링키 발급 실패";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const now = new Date();
  const periodEnd = addBillingPeriod(now, 1);

  const isOrg = ORG_PLAN_TIERS.includes(planTier);
  const ownerFilter = isOrg
    ? { organizationId: user.organizationId! }
    : { userId: user.id };

  const existing = await prisma.subscription.findFirst({
    where: {
      ...ownerFilter,
      planTier,
      status: { not: "CANCELED" },
    },
  });

  let subscriptionId: string;

  if (existing) {
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        billingKey,
        customerKey,
        status: "TRIALING",
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        seatQuantity,
      },
    });
    subscriptionId = updated.id;
  } else {
    const created = await prisma.subscription.create({
      data: {
        planTier,
        ...ownerFilter,
        userId: isOrg ? null : user.id,
        organizationId: isOrg ? user.organizationId : null,
        billingKey,
        customerKey,
        status: "TRIALING",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        seatQuantity,
      },
    });
    subscriptionId = created.id;
  }

  const charge = await chargeInitialSubscription(subscriptionId);
  if ("ok" in charge && charge.ok === false) {
    return NextResponse.json(
      {
        error: charge.failReason ?? "첫 결제에 실패했습니다. 카드 정보를 확인해 주세요.",
        subscriptionId,
      },
      { status: 402 },
    );
  }

  if (isOrg && user.organizationId && seatQuantity != null) {
    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { maxSeats: seatQuantity },
    });
  }

  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });

  return NextResponse.json({
    ok: true,
    subscription: {
      id: sub!.id,
      planTier: sub!.planTier,
      status: sub!.status,
      seatQuantity: sub!.seatQuantity,
      currentPeriodEnd: sub!.currentPeriodEnd.toISOString(),
    },
    planName: PLANS[planTier].nameKo,
    maxSeats: seatQuantity,
  });
}

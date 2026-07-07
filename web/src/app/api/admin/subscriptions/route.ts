import { NextResponse } from "next/server";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireSuperadminApi } from "@/lib/admin/auth";
import { addBillingPeriod } from "@/lib/billing/subscription";
import { ORG_PLAN_TIERS } from "@/lib/billing/plans";

const VALID_TIERS: PlanTier[] = ["ORG_ENTERPRISE", "ORG_STANDARD"];
const VALID_STATUS: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELED"];

/** SUPERADMIN — ORG_ENTERPRISE 등 수동 구독 생성(토스 미경유) */
export async function POST(req: Request) {
  const auth = await requireSuperadminApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const planTier = body.planTier as PlanTier;
  const status = (body.status as SubscriptionStatus) ?? "ACTIVE";
  const months = Number(body.months ?? 12);

  if (!organizationId || !ORG_PLAN_TIERS.includes(planTier)) {
    return NextResponse.json({ error: "organizationId와 기관 플랜 tier가 필요합니다." }, { status: 400 });
  }
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: "유효하지 않은 status입니다." }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const now = new Date();
  const periodEnd = addBillingPeriod(now, months);
  const customerKey = `hrin_org_manual_${organizationId}`;

  const existing = await prisma.subscription.findFirst({
    where: { organizationId, planTier, status: { not: "CANCELED" } },
  });

  const sub = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status,
          billingKey: null,
          customerKey,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      })
    : await prisma.subscription.create({
        data: {
          organizationId,
          planTier,
          customerKey,
          status,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

  return NextResponse.json({
    id: sub.id,
    organizationId: sub.organizationId,
    planTier: sub.planTier,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
  });
}

export async function GET() {
  const auth = await requireSuperadminApi();
  if (isAdminResponse(auth)) return auth;

  const subs = await prisma.subscription.findMany({
    where: { planTier: { in: VALID_TIERS } },
    include: { organization: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    subscriptions: subs.map((s) => ({
      id: s.id,
      planTier: s.planTier,
      status: s.status,
      organizationId: s.organizationId,
      organizationName: s.organization?.name ?? null,
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      billingKey: s.billingKey ? "•••" : null,
    })),
  });
}

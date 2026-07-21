import type { PlanTier, Subscription, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS } from "./plans";

export type BillingContext = {
  planTier: PlanTier;
  subscription: Subscription | null;
  periodStart: Date;
  periodEnd: Date;
};

const USABLE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING"];

/** 구독이 유료 혜택을 줄 수 있는 상태인지 */
export function isPaidSubscriptionActive(sub: Subscription): boolean {
  if (sub.status === "CANCELED") return false;
  if (sub.status === "PAST_DUE") return false;
  if (sub.cancelAtPeriodEnd && sub.currentPeriodEnd <= new Date()) return false;
  return USABLE_STATUSES.includes(sub.status) || sub.status === "ACTIVE";
}

function calendarMonthBounds(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function pickBestPlan(
  subs: Subscription[],
  now = new Date()
): { tier: PlanTier; sub: Subscription | null; start: Date; end: Date } {
  const active = subs.filter(
    (s) =>
      s.status !== "CANCELED" &&
      s.currentPeriodEnd > now &&
      (USABLE_STATUSES.includes(s.status) || s.status === "ACTIVE")
  );

  const priority: PlanTier[] = [
    "ORG_ENTERPRISE",
    "ORG_STANDARD",
    "INDIVIDUAL_PREMIUM",
    "INDIVIDUAL_PRO",
  ];

  for (const tier of priority) {
    const match = active.find((s) => s.planTier === tier);
    if (match) {
      return {
        tier,
        sub: match,
        start: match.currentPeriodStart,
        end: match.currentPeriodEnd,
      };
    }
  }

  const { start, end } = calendarMonthBounds(now);
  return { tier: "FREE", sub: null, start, end };
}

/** 사용자(및 소속 기관)의 현재 유효 플랜 */
export async function getBillingContext(userId: string): Promise<BillingContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });

  const orConditions: Array<{ userId: string } | { organizationId: string }> = [
    { userId },
  ];
  if (user?.organizationId) {
    orConditions.push({ organizationId: user.organizationId });
  }

  const subs = await prisma.subscription.findMany({
    where: { OR: orConditions },
    orderBy: { updatedAt: "desc" },
  });

  const { tier, sub, start, end } = pickBestPlan(subs);
  return {
    planTier: tier,
    subscription: sub,
    periodStart: start,
    periodEnd: end,
  };
}

export async function getPastDueSubscription(userId: string): Promise<Subscription | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  const orConditions: Array<{ userId: string } | { organizationId: string }> = [
    { userId },
  ];
  if (user?.organizationId) {
    orConditions.push({ organizationId: user.organizationId });
  }
  return prisma.subscription.findFirst({
    where: {
      OR: orConditions,
      status: "PAST_DUE",
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function addBillingPeriod(from: Date, months = 1): Date {
  const end = new Date(from);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

export function generateCustomerKey(scope: "user" | "org", id: string): string {
  return scope === "user" ? `hrin_user_${id}` : `hrin_org_${id}`;
}

export function generateOrderId(subscriptionId: string): string {
  return `sub_${subscriptionId}_${Date.now()}`;
}

export function planOrderName(tier: PlanTier): string {
  return `HR_IN ${PLANS[tier].nameKo} 구독`;
}

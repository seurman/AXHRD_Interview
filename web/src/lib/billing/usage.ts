import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLANS } from "./plans";
import { getBillingContext } from "./subscription";

export type UsageKind = "mock_interview" | "self_discovery";

export type UsageCheckResult =
  | { allowed: true; planTier: PlanTier; used: number; limit: number | null }
  | {
      allowed: false;
      planTier: PlanTier;
      used: number;
      limit: number;
      message: string;
      upgradeUrl: string;
    };

async function countUsage(
  userId: string,
  kind: UsageKind,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  if (kind === "mock_interview") {
    return prisma.interviewSession.count({
      where: {
        userId,
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    });
  }
  return prisma.selfDiscoverySession.count({
    where: {
      userId,
      startedAt: { gte: periodStart, lt: periodEnd },
    },
  });
}

function limitFor(kind: UsageKind, tier: PlanTier): number | null {
  const plan = PLANS[tier];
  return kind === "mock_interview"
    ? plan.limits.mockInterviewsPerMonth
    : plan.limits.selfDiscoveryPerMonth;
}

export async function checkUsageLimit(
  userId: string,
  kind: UsageKind
): Promise<UsageCheckResult> {
  const ctx = await getBillingContext(userId);
  const limit = limitFor(kind, ctx.planTier);

  if (limit === null) {
    return { allowed: true, planTier: ctx.planTier, used: 0, limit: null };
  }

  const used = await countUsage(userId, kind, ctx.periodStart, ctx.periodEnd);

  if (used >= limit) {
    const label =
      kind === "mock_interview" ? "모의면접" : "자기발견 인터뷰";
    return {
      allowed: false,
      planTier: ctx.planTier,
      used,
      limit,
      message: `이번 달 ${label} 무료 한도(${limit}회)를 모두 사용했습니다. 플랜을 업그레이드해 주세요.`,
      upgradeUrl: "/pricing",
    };
  }

  return { allowed: true, planTier: ctx.planTier, used, limit };
}

export async function getUsageSummary(userId: string) {
  const ctx = await getBillingContext(userId);
  const [interviews, discover] = await Promise.all([
    countUsage(userId, "mock_interview", ctx.periodStart, ctx.periodEnd),
    countUsage(userId, "self_discovery", ctx.periodStart, ctx.periodEnd),
  ]);
  return {
    planTier: ctx.planTier,
    periodStart: ctx.periodStart.toISOString(),
    periodEnd: ctx.periodEnd.toISOString(),
    mockInterviews: {
      used: interviews,
      limit: PLANS[ctx.planTier].limits.mockInterviewsPerMonth,
    },
    selfDiscovery: {
      used: discover,
      limit: PLANS[ctx.planTier].limits.selfDiscoveryPerMonth,
    },
  };
}

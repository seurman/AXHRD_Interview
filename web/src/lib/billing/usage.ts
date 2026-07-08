import type { PlanTier, PlatformRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/auth/superadmin";
import { isUsageExemptUser } from "@/lib/auth/roles";
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

/** 수퍼어드민 · 회사 어드민 — 월간 횟수 제한 없음 */
async function isUsageExempt(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, platformRole: true, orgRole: true, organizationId: true },
  });
  if (!user) return false;

  if (isSuperadmin(user.email) && user.platformRole !== "SUPERADMIN") {
    const { syncSuperadminPlatformRole } = await import("@/lib/auth/platform-role");
    await syncSuperadminPlatformRole(userId, user.email);
    return true;
  }

  return isUsageExemptUser({
    email: user.email,
    platformRole: user.platformRole as PlatformRole,
    orgRole: user.orgRole,
    organizationId: user.organizationId,
  });
}

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

  if (await isUsageExempt(userId)) {
    const used = await countUsage(userId, kind, ctx.periodStart, ctx.periodEnd);
    return { allowed: true, planTier: ctx.planTier, used, limit: null };
  }

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
  const exempt = await isUsageExempt(userId);
  const [interviews, discover] = await Promise.all([
    countUsage(userId, "mock_interview", ctx.periodStart, ctx.periodEnd),
    countUsage(userId, "self_discovery", ctx.periodStart, ctx.periodEnd),
  ]);
  const interviewLimit = exempt
    ? null
    : PLANS[ctx.planTier].limits.mockInterviewsPerMonth;
  const discoverLimit = exempt
    ? null
    : PLANS[ctx.planTier].limits.selfDiscoveryPerMonth;
  return {
    planTier: ctx.planTier,
    periodStart: ctx.periodStart.toISOString(),
    periodEnd: ctx.periodEnd.toISOString(),
    mockInterviews: {
      used: interviews,
      limit: interviewLimit,
    },
    selfDiscovery: {
      used: discover,
      limit: discoverLimit,
    },
  };
}

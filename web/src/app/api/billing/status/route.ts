import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getBillingContext, getPastDueSubscription } from "@/lib/billing/subscription";
import { getUsageSummary } from "@/lib/billing/usage";
import { PLANS } from "@/lib/billing/plans";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [ctx, usage, pastDue] = await Promise.all([
    getBillingContext(user.id),
    getUsageSummary(user.id),
    getPastDueSubscription(user.id),
  ]);

  return NextResponse.json({
    planTier: ctx.planTier,
    planName: PLANS[ctx.planTier].nameKo,
    subscription: ctx.subscription
      ? {
          id: ctx.subscription.id,
          status: ctx.subscription.status,
          planTier: ctx.subscription.planTier,
          currentPeriodStart: ctx.subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: ctx.subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: ctx.subscription.cancelAtPeriodEnd,
        }
      : null,
    usage,
    pastDue: !!pastDue,
    orgRole: user.orgRole,
    organizationId: user.organizationId,
  });
}

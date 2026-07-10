import type { PlanTier, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addBillingPeriod } from "@/lib/billing/subscription";

type DbClient = Prisma.TransactionClient | typeof prisma;

type UpsertOrgSubscriptionInput = {
  organizationId: string;
  planTier: PlanTier;
  status?: SubscriptionStatus;
  months?: number;
  periodEnd?: Date | null;
};

/** 슈퍼어드민 수동 기관 구독 생성·갱신 */
export async function upsertOrgSubscription(
  {
    organizationId,
    planTier,
    status = "ACTIVE",
    months = 12,
    periodEnd,
  }: UpsertOrgSubscriptionInput,
  db: DbClient = prisma,
) {
  const now = new Date();
  const end = periodEnd ?? addBillingPeriod(now, months);
  const customerKey = `hrin_org_manual_${organizationId}`;

  const existing = await db.subscription.findFirst({
    where: { organizationId, status: { not: "CANCELED" } },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return db.subscription.update({
      where: { id: existing.id },
      data: {
        planTier,
        status,
        billingKey: null,
        customerKey,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      },
    });
  }

  return db.subscription.create({
    data: {
      organizationId,
      planTier,
      customerKey,
      status,
      currentPeriodStart: now,
      currentPeriodEnd: end,
    },
  });
}

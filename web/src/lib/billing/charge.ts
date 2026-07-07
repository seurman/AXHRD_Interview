import { prisma } from "@/lib/prisma";
import { PLANS } from "./plans";
import {
  addBillingPeriod,
  generateOrderId,
  planOrderName,
} from "./subscription";
import { chargeBillingKey } from "./toss";

export async function chargeSubscription(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
  if (!sub) throw new Error("구독을 찾을 수 없습니다.");
  if (sub.cancelAtPeriodEnd) {
    return { skipped: true, reason: "cancel_scheduled" as const };
  }
  if (sub.status === "CANCELED") {
    return { skipped: true, reason: "canceled" as const };
  }
  if (!sub.billingKey) {
    throw new Error("빌링키가 없는 구독입니다(수동 계약 플랜).");
  }

  const plan = PLANS[sub.planTier];
  const amount = plan.priceMonthlyKrw;
  if (amount === null || amount <= 0) {
    throw new Error(`${sub.planTier} 플랜 가격이 설정되지 않았습니다.`);
  }

  const orderId = generateOrderId(sub.id);
  const orderName = planOrderName(sub.planTier);

  try {
    const payment = await chargeBillingKey({
      billingKey: sub.billingKey,
      customerKey: sub.customerKey,
      amount,
      orderId,
      orderName,
    });

    const now = new Date();
    const periodStart = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    const periodEnd = addBillingPeriod(periodStart, 1);

    await prisma.$transaction([
      prisma.paymentTransaction.create({
        data: {
          subscriptionId: sub.id,
          amount,
          status: "SUCCESS",
          tossPaymentKey: payment.paymentKey,
          tossOrderId: payment.orderId,
          paidAt: payment.approvedAt ? new Date(payment.approvedAt) : now,
        },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    return { ok: true as const, paymentKey: payment.paymentKey, orderId: payment.orderId };
  } catch (e) {
    const failReason = e instanceof Error ? e.message : "결제 실패";
    await prisma.$transaction([
      prisma.paymentTransaction.create({
        data: {
          subscriptionId: sub.id,
          amount,
          status: "FAILED",
          tossOrderId: orderId,
          failReason,
        },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      }),
    ]);
    return { ok: false as const, failReason };
  }
}

/** 구독 생성 직후 첫 결제 */
export async function chargeInitialSubscription(subscriptionId: string) {
  return chargeSubscription(subscriptionId);
}

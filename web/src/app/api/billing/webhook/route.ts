import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/billing/toss";

type WebhookPayload = {
  eventType?: string;
  createdAt?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    totalAmount?: number;
    billingKey?: string;
    customerKey?: string;
  };
};

/** PAYMENT_STATUS_CHANGED — 서명 헤더 없음 → paymentKey로 API 재조회 후 반영 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.eventType;
  const data = payload.data;

  if (eventType === "BILLING_DELETED" && data?.billingKey) {
    await prisma.subscription.updateMany({
      where: { billingKey: data.billingKey },
      data: { status: "CANCELED", billingKey: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (eventType === "PAYMENT_STATUS_CHANGED" && data?.paymentKey) {
    try {
      const payment = await getPayment(data.paymentKey);
      if (payment.status !== "DONE") {
        return NextResponse.json({ ok: true, ignored: payment.status });
      }

      const tx = await prisma.paymentTransaction.findUnique({
        where: { tossOrderId: payment.orderId },
        include: { subscription: true },
      });

      if (tx && tx.status === "FAILED") {
        await prisma.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: "SUCCESS",
            tossPaymentKey: payment.paymentKey,
            paidAt: payment.approvedAt ? new Date(payment.approvedAt) : new Date(),
            failReason: null,
          },
        });
        await prisma.subscription.update({
          where: { id: tx.subscriptionId },
          data: { status: "ACTIVE" },
        });
      }
    } catch {
      // 웹훅은 200 반환해 재전송 폭주 방지 — 로그만 (카드 정보 미포함)
      console.error("[billing/webhook] payment verify failed", data.paymentKey);
    }
  }

  return NextResponse.json({ ok: true });
}

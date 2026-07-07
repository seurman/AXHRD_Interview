"use client";

import { useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type { PlanTier } from "@prisma/client";
import { PLANS, formatPriceKrw } from "@/lib/billing/plans";

type PlanCardProps = {
  tier: PlanTier;
  highlighted?: boolean;
  canSubscribe: boolean;
  subscribeLabel?: string;
  loggedIn: boolean;
};

export function PlanSubscribeButton({
  tier,
  canSubscribe,
  subscribeLabel = "구독하기",
  loggedIn,
}: PlanCardProps) {
  const [loading, setLoading] = useState(false);
  const plan = PLANS[tier];

  if (!plan.selfServeBilling) {
    return (
      <a
        href="mailto:support@axhrd.com?subject=HR_IN%20Enterprise%20문의"
        className="btn-outline-primary mt-6 block w-full py-2.5 text-center text-sm"
      >
        영업 문의
      </a>
    );
  }

  if (!canSubscribe) {
    return (
      <p className="mt-6 text-center text-xs text-muted">
        {tier.startsWith("ORG_")
          ? "기관 관리자(소속 기관 ADMIN)만 구독할 수 있습니다."
          : "로그인 후 이용 가능합니다."}
      </p>
    );
  }

  if (plan.priceMonthlyKrw === null) {
    return (
      <button
        type="button"
        disabled
        className="btn-outline-primary mt-6 w-full py-2.5 text-sm opacity-50"
      >
        가격 설정 대기
      </button>
    );
  }

  const subscribe = async () => {
    if (!loggedIn) {
      window.location.href = `/auth/login?next=${encodeURIComponent("/pricing")}`;
      return;
    }
    setLoading(true);
    try {
      const prep = await fetch("/api/billing/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier }),
      });
      const data = await prep.json();
      if (!prep.ok) throw new Error(data.error ?? "결제 준비 실패");

      const tossPayments = await loadTossPayments(data.clientKey);
      const payment = tossPayments.payment({ customerKey: data.customerKey });
      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: data.successUrl,
        failUrl: data.failUrl,
        customerEmail: undefined,
        customerName: undefined,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "카드 등록을 시작할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={loading}
      className="btn-primary mt-6 w-full py-2.5 text-sm disabled:opacity-50"
    >
      {loading ? "결제창 여는 중…" : subscribeLabel}
    </button>
  );
}

export function PlanPrice({ tier }: { tier: PlanTier }) {
  const plan = PLANS[tier];
  return (
    <p className="mt-4 text-3xl font-bold text-foreground">
      {formatPriceKrw(plan.priceMonthlyKrw)}
    </p>
  );
}

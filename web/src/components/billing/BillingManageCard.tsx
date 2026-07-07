"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { planLabel } from "@/lib/billing/plans";

type BillingStatus = {
  planTier: string;
  planName: string;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string;
  } | null;
  usage: {
    mockInterviews: { used: number; limit: number | null };
    selfDiscovery: { used: number; limit: number | null };
  };
};

export function BillingManageCard() {
  const [data, setData] = useState<BillingStatus | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, []);

  const cancel = async () => {
    if (!confirm("현재 결제 주기 종료 시 구독을 해지할까요?")) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "해지 실패");
      alert(json.message ?? "해지 예약되었습니다.");
      const refreshed = await fetch("/api/billing/status").then((r) => r.json());
      setData(refreshed);
    } catch (e) {
      alert(e instanceof Error ? e.message : "해지 실패");
    } finally {
      setCanceling(false);
    }
  };

  if (!data) return null;

  return (
    <section className="card-luxe p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Billing</p>
          <p className="mt-1 font-semibold text-foreground">
            {data.planName} ({planLabel(data.planTier as never)})
          </p>
          {data.subscription && (
            <p className="mt-1 text-xs text-muted">
              {data.subscription.cancelAtPeriodEnd
                ? `해지 예약 · ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}까지 이용`
                : `다음 갱신 · ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}`}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            이번 달 모의면접 {data.usage.mockInterviews.used}
            {data.usage.mockInterviews.limit != null
              ? ` / ${data.usage.mockInterviews.limit}`
              : " (무제한)"}
            · 자기발견 {data.usage.selfDiscovery.used}
            {data.usage.selfDiscovery.limit != null
              ? ` / ${data.usage.selfDiscovery.limit}`
              : " (무제한)"}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/pricing" className="btn-outline-primary px-4 py-2 text-xs text-center">
            플랜 변경
          </Link>
          {data.subscription &&
            !data.subscription.cancelAtPeriodEnd &&
            data.subscription.status !== "CANCELED" && (
              <button
                type="button"
                onClick={cancel}
                disabled={canceling}
                className="text-xs text-muted underline disabled:opacity-50"
              >
                {canceling ? "처리 중…" : "구독 해지 예약"}
              </button>
            )}
        </div>
      </div>
    </section>
  );
}

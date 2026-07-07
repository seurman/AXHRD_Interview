"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlanTier } from "@prisma/client";
import { planLabel } from "@/lib/billing/plans";

type BillingStatus = {
  planTier: PlanTier;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/status");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error ?? "구독 정보를 불러오지 못했습니다.");
      }
      setData(json);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "구독 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async () => {
    if (!confirm("현재 결제 주기 종료 시 구독을 해지할까요?")) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "해지 실패");
      alert(json.message ?? "해지 예약되었습니다.");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "해지 실패");
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <section className="card-luxe p-6">
        <p className="text-sm text-muted">구독 정보 불러오는 중…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card-luxe border-amber-500/20 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Billing</p>
        <p className="mt-2 text-sm text-muted">
          {error ?? "구독 정보를 표시할 수 없습니다."}
        </p>
        {error?.includes("마이그레이션") && (
          <p className="mt-2 text-xs text-muted">
            운영 DB에 <code>20260707233000_add_billing_subscription</code> 마이그레이션을
            적용해 주세요.
          </p>
        )}
        <Link href="/pricing" className="mt-3 inline-block text-sm text-accent hover:underline">
          요금제 보기 →
        </Link>
      </section>
    );
  }

  return (
    <section className="card-luxe p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Billing</p>
          <p className="mt-1 font-semibold text-foreground">
            {data.planName} ({planLabel(data.planTier)})
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

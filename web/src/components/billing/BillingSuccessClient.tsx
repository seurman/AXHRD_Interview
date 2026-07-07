"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PlanTier } from "@prisma/client";
import { PLANS } from "@/lib/billing/plans";

export function BillingSuccessClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    const planTier = params.get("planTier") as PlanTier | null;

    if (!authKey || !customerKey || !planTier) {
      setStatus("error");
      setMessage("결제 인증 정보가 없습니다.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authKey, customerKey, planTier }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "구독 등록 실패");
        setStatus("ok");
        setMessage(`${data.planName ?? PLANS[planTier].nameKo} 구독이 시작되었습니다.`);
        router.refresh();
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "구독 등록 실패");
      }
    })();
  }, [params, router]);

  return (
    <div className="mx-auto max-w-lg card-luxe p-8 text-center">
      {status === "loading" && (
        <>
          <p className="text-sm text-muted">구독을 등록하는 중…</p>
        </>
      )}
      {status === "ok" && (
        <>
          <p className="text-lg font-semibold text-success">구독 완료</p>
          <p className="mt-2 text-sm text-muted">{message}</p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-block px-6 py-2 text-sm">
            대시보드로
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-lg font-semibold text-danger">등록 실패</p>
          <p className="mt-2 text-sm text-muted">{message}</p>
          <Link href="/pricing" className="btn-outline-primary mt-6 inline-block px-6 py-2 text-sm">
            요금제로 돌아가기
          </Link>
        </>
      )}
    </div>
  );
}

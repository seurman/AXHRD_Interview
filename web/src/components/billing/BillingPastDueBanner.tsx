"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BillingPastDueBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.pastDue) setShow(true);
      })
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
      자동결제에 실패했습니다. 카드 정보를 확인하거나{" "}
      <Link href="/pricing" className="font-medium underline">
        요금제·결제 수단
      </Link>
      을 업데이트해 주세요. 결제가 완료될 때까지 일부 기능이 Free 한도로 제한될 수 있습니다.
    </div>
  );
}

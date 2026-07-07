"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function BillingFailClient() {
  const params = useSearchParams();
  const code = params.get("code");
  const message = params.get("message");

  return (
    <div className="mx-auto max-w-lg card-luxe p-8 text-center">
      <p className="text-lg font-semibold text-foreground">카드 등록이 완료되지 않았습니다</p>
      {message && (
        <p className="mt-2 text-sm text-muted">
          {decodeURIComponent(message)}
          {code ? ` (${code})` : ""}
        </p>
      )}
      <Link href="/pricing" className="btn-primary mt-6 inline-block px-6 py-2 text-sm">
        요금제 다시 보기
      </Link>
    </div>
  );
}

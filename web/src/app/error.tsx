"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="card-luxe p-8">
        <h1 className="text-xl font-semibold text-foreground">일시적인 오류</h1>
        <p className="mt-3 text-sm text-muted">
          페이지를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary text-sm">
            다시 시도
          </button>
          <Link href="/" className="btn-secondary text-sm">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

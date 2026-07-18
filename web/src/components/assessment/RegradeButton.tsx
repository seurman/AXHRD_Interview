"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** 채점 실패/지연 시 재채점 트리거 — submit 엔드포인트 재호출(멱등) */
export function RegradeButton({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regrade() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "채점 재시도에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? <span className="text-xs text-warning">{error}</span> : null}
      <button
        type="button"
        onClick={() => void regrade()}
        disabled={busy}
        className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "채점 중…" : "리포트 다시 생성"}
      </button>
    </div>
  );
}

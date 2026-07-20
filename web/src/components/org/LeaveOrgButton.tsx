"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LeaveOrgButton({
  organizationName,
}: {
  organizationName?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    const label = organizationName ? `「${organizationName}」` : "기관";
    if (!confirm(`${label} 소속을 해제할까요? 좌석이 반환됩니다.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/org/leave", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "탈퇴 실패");
      router.push(typeof data.redirect === "string" ? data.redirect : "/org/setup");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "탈퇴 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void leave()}
      disabled={busy}
      className="text-sm text-danger hover:underline disabled:opacity-50"
    >
      {busy ? "처리 중…" : "기관 탈퇴"}
    </button>
  );
}

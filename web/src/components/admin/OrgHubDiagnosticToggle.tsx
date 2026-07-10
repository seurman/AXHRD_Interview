"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity } from "lucide-react";

type Props = {
  organizationId: string;
  enabled: boolean;
};

export function OrgHubDiagnosticToggle({ organizationId, enabled }: Props) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/organizations/diagnostic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, enabled: !on }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "변경 실패");
        return;
      }
      setOn(json.organization.diagnosticEnabled);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        on ? "border-accent/40 bg-gradient-to-br from-accent/10 to-transparent" : "border-card-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${on ? "text-accent" : "text-muted"}`} />
            <p className="font-semibold text-foreground">ARC Index 조직진단</p>
          </div>
          <p className="mt-2 text-sm text-muted">
            기관 ADMIN 네비 「기관 → 조직진단」 및 <code className="text-xs">/org/diagnosis</code> 콘솔.
            계약 SKU 별도 활성화입니다.
          </p>
          {!on && (
            <p className="mt-2 text-xs text-amber-700">
              OFF 상태면 기관 관리자 메뉴에 조직진단이 표시되지 않습니다.
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            on ? "bg-accent" : "bg-card-border"
          }`}
          aria-pressed={on}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
              on ? "left-7" : "left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

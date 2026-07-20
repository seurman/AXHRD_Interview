"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";

type Props = {
  organizationId: string;
  organizationName: string;
  enabled: boolean;
  compact?: boolean;
};

export function OrgDiagnosticToggle({
  organizationId,
  organizationName,
  enabled,
  compact = false,
}: Props) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [pendingNext, setPendingNext] = useState<boolean | null>(null);

  async function applyToggle(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/organizations/diagnostic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, enabled: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "변경 실패");
        return;
      }
      setOn(json.organization.diagnosticEnabled);
      setPendingNext(null);
      toast.success(next ? "조직진단을 활성화했습니다." : "조직진단을 비활성화했습니다.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function requestToggle(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    setPendingNext(!on);
  }

  const dialog = (
    <AdminConfirmDialog
      open={pendingNext != null}
      onOpenChange={(open) => {
        if (!open && !busy) setPendingNext(null);
      }}
      title="조직진단 권한"
      description={
        pendingNext != null
          ? `${organizationName}의 「ARC Index 조직진단」을(를) ${
              pendingNext ? "활성화" : "비활성화"
            }할까요?${
              pendingNext
                ? ""
                : "\n비활성화하면 기관 관리자에게 조직진단 메뉴가 즉시 숨겨집니다."
            }`
          : undefined
      }
      confirmLabel={pendingNext ? "활성화" : "비활성화"}
      confirmTone={pendingNext ? "primary" : "danger"}
      busy={busy}
      onConfirm={() => {
        if (pendingNext == null) return;
        return applyToggle(pendingNext);
      }}
    />
  );

  if (compact) {
    return (
      <div
        className="flex items-center justify-between gap-3 border-t border-card-border px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">ARC 조직진단 SKU</p>
          <p className="text-[11px] text-muted">기관 메뉴 「조직진단」 노출</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={(e) => requestToggle(e)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            on ? "bg-accent" : "bg-card-border"
          }`}
          aria-pressed={on}
          aria-label={`${organizationName} 조직진단 ${on ? "끄기" : "켜기"}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
              on ? "left-5" : "left-0.5"
            }`}
          />
        </button>
        {dialog}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        on ? "border-accent/40 bg-gradient-to-br from-accent/10 to-transparent" : "border-card-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">ARC Index 조직진단</p>
          <p className="mt-2 text-sm text-muted">
            기관 ADMIN 네비 「기관 → 조직진단」 및 웨이브·팀·산출물 콘솔.
          </p>
          {!on && (
            <p className="mt-2 text-xs text-amber-700">
              OFF — 기관 관리자에게 조직진단 메뉴가 보이지 않습니다.
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => requestToggle()}
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
      {dialog}
    </div>
  );
}

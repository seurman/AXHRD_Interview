"use client";

import { useEffect, useId, useRef } from "react";

export type MembershipReviewMode = "approve" | "reject";

export function MembershipReviewModal({
  open,
  mode,
  count,
  isAdmin,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: MembershipReviewMode;
  count: number;
  isAdmin: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (opts: {
    orgRole: "MEMBER" | "STAFF";
    rejectReason: string;
  }) => void;
}) {
  const titleId = useId();
  const roleRef = useRef<HTMLSelectElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-card-border bg-card p-5 shadow-luxe"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-foreground">
          {mode === "approve" ? `승인 (${count}명)` : `거절 (${count}건)`}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {mode === "approve"
            ? "선택한 가입 요청을 승인하고 좌석을 배정합니다."
            : "거절 사유는 선택 사항입니다. 신청자에게는 대기 상태가 해제됩니다."}
        </p>

        {mode === "approve" ? (
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted">배정 역할</span>
            <select
              ref={roleRef}
              defaultValue="MEMBER"
              disabled={busy}
              className="min-h-10 w-full rounded-lg border border-card-border bg-background px-3 text-sm"
            >
              <option value="MEMBER">구성원</option>
              {isAdmin ? <option value="STAFF">담당자</option> : null}
            </select>
          </label>
        ) : (
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-muted">거절 사유 (선택)</span>
            <textarea
              ref={reasonRef}
              rows={3}
              disabled={busy}
              placeholder="예: 소속 확인이 필요합니다."
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-50"
            disabled={busy}
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className={`px-3 py-2 text-sm disabled:opacity-50 ${
              mode === "approve" ? "btn-primary" : "rounded-lg bg-danger px-3 py-2 text-white"
            }`}
            disabled={busy}
            onClick={() =>
              onConfirm({
                orgRole:
                  roleRef.current?.value === "STAFF" ? "STAFF" : "MEMBER",
                rejectReason: reasonRef.current?.value?.trim() ?? "",
              })
            }
          >
            {busy ? "처리 중…" : mode === "approve" ? "승인" : "거절"}
          </button>
        </div>
      </div>
    </div>
  );
}

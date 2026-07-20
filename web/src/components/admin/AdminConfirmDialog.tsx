"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** 관리자 콘솔 확인 다이얼로그 — window.confirm 대체 */
export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "계속",
  cancelLabel = "취소",
  confirmTone = "primary",
  busy = false,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="border-[var(--platform-border)] bg-[var(--platform-surface)] shadow-luxe sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-[var(--platform-text)]">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="whitespace-pre-line text-[var(--platform-text-muted)]">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="border-[var(--platform-border)] bg-transparent sm:justify-end">
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            className={
              confirmTone === "danger"
                ? "rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                : "btn-primary px-4 py-2 text-sm disabled:opacity-50"
            }
            onClick={() => void onConfirm()}
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

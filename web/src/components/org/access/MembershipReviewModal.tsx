"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [orgRole, setOrgRole] = useState<"MEMBER" | "STAFF">("MEMBER");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setOrgRole("MEMBER");
    setRejectReason("");
  }, [open, mode]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton
        className="border-card-border bg-card shadow-luxe sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {mode === "approve" ? `승인 (${count}명)` : `거절 (${count}건)`}
          </DialogTitle>
          <DialogDescription className="text-muted">
            {mode === "approve"
              ? "선택한 가입 요청을 승인하고 좌석을 배정합니다."
              : "거절 사유는 선택 사항입니다. 신청자에게는 대기 상태가 해제됩니다."}
          </DialogDescription>
        </DialogHeader>

        {mode === "approve" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted">배정 역할</p>
            <Select
              value={orgRole}
              onValueChange={(v) => setOrgRole(v === "STAFF" ? "STAFF" : "MEMBER")}
              disabled={busy}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">구성원</SelectItem>
                {isAdmin ? <SelectItem value="STAFF">담당자</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <label className="block space-y-2 text-sm">
            <span className="block text-xs font-medium text-muted">거절 사유 (선택)</span>
            <textarea
              rows={3}
              disabled={busy}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="예: 소속 확인이 필요합니다."
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        )}

        <DialogFooter className="border-card-border bg-transparent sm:justify-end">
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
            className={
              mode === "approve"
                ? "btn-primary px-3 py-2 text-sm disabled:opacity-50"
                : "rounded-lg bg-danger px-3 py-2 text-sm text-white disabled:opacity-50"
            }
            disabled={busy}
            onClick={() =>
              onConfirm({
                orgRole,
                rejectReason: rejectReason.trim(),
              })
            }
          >
            {busy ? "처리 중…" : mode === "approve" ? "승인" : "거절"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

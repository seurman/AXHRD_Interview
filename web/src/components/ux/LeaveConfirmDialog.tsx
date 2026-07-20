"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  title?: string;
  description?: string;
  leaveHref?: string;
  onConfirmLeave?: () => void;
  /** 세션/응답 URL — 있으면 복사 버튼 노출 (이어하기용) */
  sessionUrl?: string;
  copyLinkLabel?: string;
  copiedLabel?: string;
};

/** 면접·진단 응답 중도 이탈 확인 */
export function LeaveConfirmDialog({
  open,
  onOpenChange,
  title = "나가시겠습니까?",
  description = "진행 중인 내용이 저장되지 않을 수 있습니다.",
  leaveHref = "/",
  onConfirmLeave,
  sessionUrl,
  copyLinkLabel = "세션 링크 복사",
  copiedLabel = "복사됨",
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCopied(false);
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton className="border-card-border bg-card shadow-luxe sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted">{description}</DialogDescription>
        </DialogHeader>
        {sessionUrl ? (
          <div className="space-y-2 rounded-xl border border-card-border bg-background/60 px-3 py-2.5">
            <p className="break-all font-mono text-[11px] leading-relaxed text-muted">
              {sessionUrl}
            </p>
            <button
              type="button"
              className="text-xs font-medium text-accent underline-offset-2 hover:underline"
              onClick={async () => {
                const absolute =
                  typeof window !== "undefined"
                    ? new URL(sessionUrl, window.location.origin).toString()
                    : sessionUrl;
                try {
                  await navigator.clipboard.writeText(absolute);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? copiedLabel : copyLinkLabel}
            </button>
          </div>
        ) : null}
        <DialogFooter className="border-card-border bg-transparent sm:justify-end">
          <button
            type="button"
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() => onOpenChange(false)}
          >
            계속하기
          </button>
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm"
            onClick={() => {
              onOpenChange(false);
              if (onConfirmLeave) onConfirmLeave();
              else router.push(leaveHref);
            }}
          >
            나가기
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

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
};

/** 면접·진단 응답 중도 이탈 확인 */
export function LeaveConfirmDialog({
  open,
  onOpenChange,
  title = "나가시겠습니까?",
  description = "진행 중인 내용이 저장되지 않을 수 있습니다.",
  leaveHref = "/",
  onConfirmLeave,
}: Props) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="border-card-border bg-card shadow-luxe sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted">{description}</DialogDescription>
        </DialogHeader>
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

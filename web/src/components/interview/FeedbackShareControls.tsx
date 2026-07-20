"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PrintButton } from "@/components/ui/PrintButton";

/** 역량 피드백·차수 요약 공유 — URL 복사 + 인쇄(PDF) */
export function FeedbackShareControls({
  label = "이 피드백 링크 복사",
}: {
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("링크를 복사했습니다");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("링크 복사에 실패했습니다");
    }
  };

  return (
    <div className="print-hide flex flex-wrap items-center gap-2">
      <PrintButton />
      <button type="button" onClick={() => void copy()} className="btn-secondary text-sm">
        {copied ? "복사됨" : label}
      </button>
    </div>
  );
}

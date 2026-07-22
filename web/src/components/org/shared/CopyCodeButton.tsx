"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한 없으면 조용히 무시 — 코드는 화면에 이미 보임
    }
  };

  return (
    <button type="button" onClick={copy} className="btn-secondary text-sm">
      {copied ? "복사됨 ✓" : "코드 복사"}
    </button>
  );
}

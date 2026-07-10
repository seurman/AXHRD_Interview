"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/** CMS 링크·코드 복사 행 — 진단 링크·가입 코드 등 운영 필드에 공통 사용 */
export function AdminCopyField({
  label,
  hint,
  value,
  mono = true,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || hint) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {label && <p className="text-sm font-medium text-foreground">{label}</p>}
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <code
          className={cn(
            "min-w-0 flex-1 truncate rounded-lg border border-card-border bg-background px-3 py-2 text-xs",
            mono && "font-mono",
          )}
        >
          {value}
        </code>
        <button
          type="button"
          className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
    </div>
  );
}

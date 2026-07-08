"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  label = "PDF로 저장",
  className = "btn-secondary inline-flex items-center gap-2 text-sm",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}

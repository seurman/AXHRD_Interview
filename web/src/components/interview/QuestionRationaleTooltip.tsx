"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

export function QuestionRationaleTooltip({ rationale }: { rationale: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <div className="group/rationale relative mt-3 inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-semibold text-gold transition-colors hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        질문 근거
      </button>

      <div
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-0 top-full z-30 mt-2 w-72 max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-gold/30 bg-card p-3 text-xs leading-relaxed text-muted shadow-luxe transition-all duration-150 ${
          open
            ? "translate-y-0 opacity-100"
            : "invisible translate-y-1 opacity-0 group-hover/rationale:visible group-hover/rationale:translate-y-0 group-hover/rationale:opacity-100"
        }`}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          AI 질문 설계 근거
        </p>
        {rationale}
      </div>
    </div>
  );
}

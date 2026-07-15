"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { REPORT_GUIDE } from "@/lib/diagnostic/report-guide";
import type { ExecutiveSummaryParts } from "@/lib/diagnostic/report-narratives";

export function ReportGuideCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card-luxe overflow-hidden border border-gold/20">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">How to read</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{REPORT_GUIDE.title}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="space-y-4 border-t border-card-border px-5 py-4 text-sm">
          <GuideBlock title="이 리포트가 말하는 것" items={[...REPORT_GUIDE.says]} />
          <GuideBlock title="말하지 않는 것" items={[...REPORT_GUIDE.doesNotSay]} />
          <GuideBlock title="읽는 순서" items={[...REPORT_GUIDE.readingOrder]} ordered />
        </div>
      )}
    </div>
  );
}

function GuideBlock({
  title,
  items,
  ordered,
}: {
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <div>
      <p className="text-xs font-semibold text-foreground">{title}</p>
      <List className={`mt-1.5 space-y-1.5 text-muted ${ordered ? "list-decimal pl-4" : "list-disc pl-4"}`}>
        {items.map((t) => (
          <li key={t} className="leading-relaxed report-prose">
            {t}
          </li>
        ))}
      </List>
    </div>
  );
}

export function ExecutiveSummaryCard({ parts }: { parts: ExecutiveSummaryParts }) {
  return (
    <div className="card-luxe relative overflow-hidden border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">Executive Summary</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-foreground report-prose">{parts.story}</p>
      <p className="mt-4 rounded-xl border border-card-border/80 bg-background/50 px-3.5 py-3 text-xs leading-relaxed text-muted report-prose">
        {parts.caution}
      </p>
    </div>
  );
}

/** 축 탭 상단 — 정의 + 밴드 해석 */
export function AxisNarrativeBlock({
  axisLabel,
  definition,
  interpretation,
}: {
  axisLabel: string;
  definition: string;
  interpretation: string;
}) {
  return (
    <div className="card-luxe space-y-3 border border-gold/20 p-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">{axisLabel}</p>
        <p className="mt-1.5 text-sm font-medium text-foreground report-prose">{definition}</p>
      </div>
      <p className="text-sm leading-relaxed text-muted report-prose">{interpretation}</p>
    </div>
  );
}

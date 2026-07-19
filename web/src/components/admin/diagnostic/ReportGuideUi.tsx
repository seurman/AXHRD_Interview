"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  AXIS_DEFINITIONS,
  ORI_OVI_QUADRANTS,
  REPORT_GUIDE,
  type AxisCode,
} from "@/lib/diagnostic/report-guide";
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

const AXIS_ORDER: AxisCode[] = ["OHI", "ORI", "OVI", "OAI"];

/** 차트 제목 옆 ⓘ — AXIS_DEFINITIONS oneLiner 팝오버(외부 라이브러리 없음) */
export function AxisDefinitionsHint({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-card-border text-[11px] font-semibold text-muted hover:border-gold/40 hover:text-foreground"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="4축 정의 보기"
        title="4축 정의"
        onClick={() => setOpen((v) => !v)}
      >
        ⓘ
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="4축 정의"
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-card-border bg-card p-3 shadow-lg sm:w-80"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Axis definitions</p>
          <ul className="space-y-2.5">
            {AXIS_ORDER.map((code) => {
              const def = AXIS_DEFINITIONS[code];
              return (
                <li key={code} className="text-xs leading-relaxed">
                  <span className="font-semibold text-foreground">
                    {code} · {def.name}
                  </span>
                  <span className="mt-0.5 block text-muted report-prose">{def.oneLiner}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </span>
  );
}

/** ORI×OVI 사분면 2×2 미니 범례 */
export function OriOviQuadrantLegend({ activeKey }: { activeKey?: string | null }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {ORI_OVI_QUADRANTS.map((q) => {
        const active = activeKey === q.key;
        return (
          <div
            key={q.key}
            className={`rounded-lg border px-2.5 py-2 ${
              active
                ? "border-gold/40 bg-gold/[0.07]"
                : "border-card-border/80 bg-background/40"
            }`}
          >
            <p className="text-[11px] font-semibold text-foreground">{q.label}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted report-prose">{q.text}</p>
          </div>
        );
      })}
    </div>
  );
}

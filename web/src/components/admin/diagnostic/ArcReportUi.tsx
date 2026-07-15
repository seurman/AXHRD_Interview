"use client";

import type { ReactNode } from "react";
import type { KeyFinding } from "@/lib/diagnostic/report-narratives";
import type { PrescriptionItem } from "@/lib/diagnostic/prescription";
import type { WaveGoal } from "@/lib/diagnostic/report-narratives";
import { formatScore, scoreBarPct } from "@/lib/diagnostic/format-score";

export function ReportSection({
  id,
  title,
  subtitle,
  active,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={`arc-report-${id}`}
      className={`arc-report-section space-y-5 ${active ? "arc-report-section--active" : ""}`}
      aria-hidden={!active}
    >
      <header className="arc-report-section-head">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gold">ARC Index</p>
        <h2 className="mt-1 text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export type AxisScore = {
  code: string;
  label?: string;
  value: number | null | undefined;
  band?: string | null;
  hint?: string;
  /** 한 줄 의미 (정의 + 점수 해석) */
  meaning?: string;
};

/** Denison-style dark score board for 4 axes */
export function ScoreHero({
  title,
  meta,
  axes,
  children,
}: {
  title: string;
  meta?: string;
  axes: AxisScore[];
  children?: ReactNode;
}) {
  return (
    <div className="arc-score-hero">
      <p className="arc-score-hero__eyebrow">Organization Pulse</p>
      <h3 className="arc-score-hero__title">{title}</h3>
      {meta && <p className="arc-score-hero__meta">{meta}</p>}
      <div className="arc-axis-grid">
        {axes.map((a) => {
          const pct = scoreBarPct(a.value);
          return (
            <div key={a.code} className="arc-axis-card">
              <p className="arc-axis-card__code">{a.code}</p>
              <p className="arc-axis-card__value">{formatScore(a.value)}</p>
              {(a.band || a.label) && (
                <p className="arc-axis-card__band">{a.band ?? a.label}</p>
              )}
              {a.hint && <p className="arc-axis-card__band">{a.hint}</p>}
              <div className="arc-axis-card__bar" aria-hidden>
                <div className="arc-axis-card__fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="arc-axis-card__scale">1.00 — 5.00</p>
              {a.meaning && <p className="arc-axis-card__meaning">{a.meaning}</p>}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  band,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  band?: string | null;
  hint?: string;
}) {
  const bandTone =
    band?.includes("우수") || band?.includes("양호")
      ? "text-emerald-600 dark:text-emerald-400"
      : band?.includes("위험") || band?.includes("주의")
        ? "text-amber-600 dark:text-amber-400"
        : "text-gold";
  return (
    <div className="arc-metric-tile">
      <div className="arc-metric-tile__ring" aria-hidden />
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-outfit)] text-3xl font-bold tabular-nums text-foreground">
        {formatScore(value)}
      </p>
      {band && <p className={`mt-1 text-xs font-semibold ${bandTone}`}>{band}</p>}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function FindingCard({ finding }: { finding: KeyFinding }) {
  const border =
    finding.severity === "critical"
      ? "border-l-red-500"
      : finding.severity === "warning"
        ? "border-l-amber-500"
        : "border-l-emerald-500";
  return (
    <div className={`card-luxe border-l-4 ${border} p-5 transition-shadow hover:shadow-luxe`}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 font-[family-name:var(--font-outfit)] text-sm font-bold text-gold">
          {finding.rank}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-foreground">{finding.title}</h4>
          <p className="mt-1.5 text-sm leading-relaxed text-muted report-prose">{finding.body}</p>
        </div>
      </div>
    </div>
  );
}

export function NarrativeBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="card-luxe relative overflow-hidden border border-gold/25 bg-gradient-to-br from-gold/[0.07] to-transparent p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">{label}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-foreground report-prose">{text}</p>
    </div>
  );
}

export function SubscoreBar({
  label,
  value,
  benchmark = 3.5,
}: {
  label: string;
  value: number | null;
  benchmark?: number;
}) {
  const pct = scoreBarPct(value);
  const benchPct = scoreBarPct(benchmark);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted">{formatScore(value)}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-gold to-primary/80"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 h-2.5 w-0.5 bg-foreground/40"
          style={{ left: `${benchPct}%` }}
          title={`기준 ${formatScore(benchmark)}`}
        />
      </div>
    </div>
  );
}

export function PrescriptionCard({ item, showWave }: { item: PrescriptionItem; showWave?: boolean }) {
  return (
    <div className="card-luxe p-4 transition-shadow hover:shadow-luxe">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
          {item.priority}
        </span>
        <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted report-prose">{item.rationale}</p>
      <p className="mt-2 text-xs font-medium text-foreground">→ {item.action}</p>
      {showWave && (
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">개입 순서 #{item.priority}</p>
      )}
    </div>
  );
}

export function WaveGoalCard({ goal }: { goal: WaveGoal }) {
  return (
    <div className="card-luxe p-4">
      <h4 className="text-sm font-semibold text-foreground">{goal.title}</h4>
      <ul className="mt-3 space-y-2">
        {goal.targets.map((t) => (
          <li key={t} className="flex gap-2 text-xs text-muted">
            <span className="text-gold">▸</span>
            <span className="report-prose">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function QuadrantLegend() {
  const items = [
    { label: "이상 구역", color: "bg-emerald-500", desc: "ORI·OVI 모두 평균 이상" },
    { label: "속도 과잉", color: "bg-sky-500", desc: "OVI 높음, ORI 낮음" },
    { label: "방향 부재", color: "bg-amber-500", desc: "ORI 높음, OVI 낮음" },
    { label: "위기 구역", color: "bg-red-500", desc: "ORI·OVI 모두 평균 이하" },
  ];
  return (
    <div className="flex flex-wrap gap-3 text-[11px]">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-muted">
          <span className={`h-2.5 w-2.5 rounded-full ${i.color}`} />
          <span className="font-medium text-foreground">{i.label}</span>
          <span className="hidden sm:inline">— {i.desc}</span>
        </span>
      ))}
    </div>
  );
}

export const QUADRANT_FILL: Record<string, string> = {
  IDEAL: "#10b981",
  POSITIVE_GAP: "#0ea5e9",
  NEGATIVE_GAP: "#f59e0b",
  CRISIS: "#ef4444",
};

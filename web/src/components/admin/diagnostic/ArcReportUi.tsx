"use client";

import type { ReactNode } from "react";
import type { KeyFinding } from "@/lib/diagnostic/report-narratives";
import type { PrescriptionItem } from "@/lib/diagnostic/prescription";
import type { WaveGoal } from "@/lib/diagnostic/report-narratives";

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
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
        {value != null ? value.toFixed(2) : "—"}
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
    <div className={`card-luxe border-l-4 ${border} p-4`}>
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">
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
    <div className="card-luxe border border-gold/25 bg-gold/[0.04] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground report-prose">{text}</p>
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
  const pct = value != null ? Math.min(100, Math.max(0, ((value - 1) / 4) * 100)) : 0;
  const benchPct = ((benchmark - 1) / 4) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted">{value?.toFixed(2) ?? "—"}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-black/5 dark:bg-white/10">
        <div className="h-2.5 rounded-full bg-gold/80" style={{ width: `${pct}%` }} />
        <div
          className="absolute top-0 h-2.5 w-0.5 bg-foreground/40"
          style={{ left: `${benchPct}%` }}
          title={`기준 ${benchmark}`}
        />
      </div>
    </div>
  );
}

export function PrescriptionCard({ item, showWave }: { item: PrescriptionItem; showWave?: boolean }) {
  return (
    <div className="card-luxe p-4">
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

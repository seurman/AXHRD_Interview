"use client";

import { ChevronRight } from "lucide-react";
import { STATUS_CLASS } from "@/lib/diagnostic/analysis-tables";
import { heatmapTone, type OrgBiMatrixRow } from "@/lib/diagnostic/org-analysis";

function GapCell({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-muted">—</span>;
  const positive = gap >= 0;
  return (
    <span className={positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
      {positive ? "+" : ""}
      {gap.toFixed(2)}
    </span>
  );
}

function MetricColumn({ cell }: { cell: OrgBiMatrixRow["OHI"] }) {
  return (
    <>
      <td className="px-2 py-2 text-center tabular-nums">
        <span className={`inline-block min-w-[2.25rem] rounded px-1.5 py-0.5 ${heatmapTone(cell.value)}`}>
          {cell.value?.toFixed(2) ?? "—"}
        </span>
      </td>
      <td className="px-2 py-2 text-center tabular-nums text-[11px]">
        <GapCell gap={cell.gap} />
      </td>
    </>
  );
}

export function OrgBiMatrix({
  title,
  subtitle,
  benchmarkLabel,
  rows,
  enabledAxes,
  onDrill,
}: {
  title: string;
  subtitle: string;
  benchmarkLabel: string;
  rows: OrgBiMatrixRow[];
  enabledAxes: Array<"OHI" | "ORI" | "OVI" | "OAI">;
  onDrill: (id: string) => void;
}) {
  if (!rows.length) return null;

  return (
    <div className="card-luxe overflow-x-auto p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
      <p className="mt-1 text-[10px] text-muted">벤치마크: {benchmarkLabel} · 격차 = 실적 − 벤치마크</p>
      <table className="mt-3 min-w-[720px] w-full text-xs">
        <thead>
          <tr className="border-b border-black/10 text-muted dark:border-white/10">
            <th className="py-2 pr-2 text-left" rowSpan={2}>
              #
            </th>
            <th className="py-2 pr-3 text-left" rowSpan={2}>
              조직
            </th>
            <th className="py-2 pr-2 text-center" rowSpan={2}>
              N
            </th>
            {enabledAxes.map((axis) => (
              <th key={axis} className="border-l border-black/5 px-2 py-1 text-center dark:border-white/10" colSpan={2}>
                {axis}
              </th>
            ))}
            <th className="border-l border-black/5 py-2 pl-2 text-center dark:border-white/10" rowSpan={2}>
              종합 격차
            </th>
          </tr>
          <tr className="border-b border-black/10 text-[10px] text-muted dark:border-white/10">
            {enabledAxes.flatMap((axis) => [
              <th key={`${axis}-v`} className="border-l border-black/5 px-2 py-1 text-center font-normal dark:border-white/10">
                점수
              </th>,
              <th key={`${axis}-g`} className="px-2 py-1 text-center font-normal">
                Δ
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-black/5 dark:border-white/5 ${row.isCurrent ? "bg-gold/5" : ""} ${row.hidden ? "opacity-50" : ""}`}
            >
              <td className="py-2 pr-2 tabular-nums text-muted">{row.rank}</td>
              <td className="py-2 pr-3">
                <button
                  type="button"
                  className="flex max-w-[200px] items-center gap-1 text-left font-medium text-foreground hover:text-accent print:pointer-events-none"
                  onClick={() => onDrill(row.id)}
                >
                  <span className="truncate">
                    <span className="text-[10px] text-muted">{row.level} · </span>
                    {row.name}
                  </span>
                  {row.hasChildren && <ChevronRight className="h-3 w-3 shrink-0 text-muted" />}
                </button>
                {row.hidden && <span className="block text-[10px] text-muted">표본 부족</span>}
              </td>
              <td className="py-2 pr-2 text-center tabular-nums text-muted">{row.sampleSize ?? "—"}</td>
              {enabledAxes.includes("OHI") && <MetricColumn cell={row.OHI} />}
              {enabledAxes.includes("ORI") && <MetricColumn cell={row.ORI} />}
              {enabledAxes.includes("OVI") && <MetricColumn cell={row.OVI} />}
              {enabledAxes.includes("OAI") && <MetricColumn cell={row.OAI} />}
              <td className="border-l border-black/5 py-2 pl-2 text-center tabular-nums dark:border-white/10">
                <GapCell gap={row.compositeGap} />
                {row.composite != null && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${row.compositeGap != null && row.compositeGap >= 0 ? STATUS_CLASS["양호"] : STATUS_CLASS["주의"]}`}
                  >
                    {row.rank}위
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

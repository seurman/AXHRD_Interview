"use client";

import type { AnalysisRow } from "@/lib/diagnostic/analysis-tables";
import { STATUS_CLASS } from "@/lib/diagnostic/analysis-tables";

export function AnalysisTable({
  title,
  subtitle,
  rows,
  columns = "default",
}: {
  title: string;
  subtitle?: string;
  rows: AnalysisRow[];
  columns?: "default" | "driver" | "weighted";
}) {
  if (!rows.length) return null;
  return (
    <div className="card-luxe overflow-x-auto p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <table className="mt-3 w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-black/10 text-muted dark:border-white/10">
            <th className="py-2 pr-3 font-medium">항목</th>
            <th className="py-2 pr-3 font-medium">점수</th>
            <th className="py-2 pr-3 font-medium">{columns === "driver" ? "중요도" : "기준"}</th>
            {columns !== "default" && (
              <th className="py-2 pr-3 font-medium">{columns === "driver" ? "β" : "가중기여"}</th>
            )}
            <th className="py-2 pr-3 font-medium">격차</th>
            <th className="py-2 pr-3 font-medium">판정</th>
            <th className="py-2 font-medium">해석</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 pr-3 font-medium text-foreground">{row.label}</td>
              <td className="py-2 pr-3 tabular-nums">{row.score?.toFixed(2) ?? "—"}</td>
              <td className="py-2 pr-3 tabular-nums text-muted">
                {row.benchmark?.toFixed(2) ?? "—"}
              </td>
              {columns !== "default" && (
                <td className="py-2 pr-3 tabular-nums text-muted">
                  {row.secondary != null
                    ? columns === "weighted"
                      ? row.secondary.toFixed(2)
                      : row.secondary.toFixed(2)
                    : "—"}
                </td>
              )}
              <td className="py-2 pr-3 tabular-nums">
                {row.gap != null ? (
                  <span className={row.gap > 0.3 ? "font-medium text-amber-600 dark:text-amber-400" : ""}>
                    {row.gap > 0 ? "+" : ""}
                    {row.gap.toFixed(2)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 pr-3">
                {row.status ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[row.status]}`}>
                    {row.status}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 text-muted report-prose">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IpaQuadrantChart({
  data,
}: {
  data: Array<{
    code: string;
    label: string;
    current: number;
    importance: number;
    beta: number | null;
    priority: string | null;
  }>;
}) {
  if (data.length < 2) return null;
  const mid = 3.5;
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold text-foreground">드라이버 IPA 매트릭스</h3>
      <p className="mt-0.5 text-xs text-muted">
        X=현재 수준 · Y=중요도 · 점선=기준 3.5 · 빨강=집중개선(FOCUS)
      </p>
      <div className="relative mt-3 h-72">
        <div className="pointer-events-none absolute inset-8 grid grid-cols-2 grid-rows-2 text-[10px] text-muted/60">
          <div className="border-r border-b border-dashed border-black/10 p-1 dark:border-white/10">유지·강화</div>
          <div className="border-b border-dashed border-black/10 p-1 dark:border-white/10">핵심 강점</div>
          <div className="border-r border-dashed border-black/10 p-1 dark:border-white/10">집중 개선</div>
          <div className="p-1">과투자 점검</div>
        </div>
        <svg viewBox="0 0 400 280" className="h-full w-full">
          <line x1="40" y1="240" x2="380" y2="240" stroke="currentColor" strokeOpacity={0.2} />
          <line x1="40" y1="20" x2="40" y2="240" stroke="currentColor" strokeOpacity={0.2} />
          <line
            x1={40 + ((mid - 1) / 4) * 340}
            y1="20"
            x2={40 + ((mid - 1) / 4) * 340}
            y2="240"
            stroke="#94a3b8"
            strokeDasharray="4 4"
          />
          <line
            x1="40"
            y1={240 - ((mid - 1) / 4) * 220}
            x2="380"
            y2={240 - ((mid - 1) / 4) * 220}
            stroke="#94a3b8"
            strokeDasharray="4 4"
          />
          {data.map((d) => {
            const cx = 40 + ((d.current - 1) / 4) * 340;
            const cy = 240 - ((d.importance - 1) / 4) * 220;
            const fill = d.priority === "FOCUS" ? "#ef4444" : "#c9a227";
            return (
              <g key={d.code}>
                <circle cx={cx} cy={cy} r={14} fill={fill} fillOpacity={0.75} />
                <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold">
                  {d.code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-2 grid gap-1 text-[11px] sm:grid-cols-2">
        {data
          .filter((d) => d.priority === "FOCUS")
          .map((d) => (
            <li key={d.code} className="text-muted">
              <span className="font-medium text-red-600 dark:text-red-400">{d.label}</span>
              {d.beta != null ? ` · β=${d.beta.toFixed(2)}` : ""}
            </li>
          ))}
      </ul>
    </div>
  );
}

export function PrescriptionTable({
  items,
}: {
  items: Array<{
    priority: number;
    title: string;
    rationale: string;
    action: string;
    source: string;
  }>;
}) {
  if (!items.length) return null;
  const sourceLabel: Record<string, string> = {
    driver: "IPA(개인)",
    team_driver: "HLM(팀)",
    opportunity: "ORI 기회",
    oaiPattern: "OAI 패턴",
    reliability: "ICC",
    lpa: "LPA",
  };
  return (
    <div className="card-luxe overflow-x-auto p-4">
      <h3 className="text-sm font-semibold text-foreground">개입 우선순위 분석표</h3>
      <table className="mt-3 w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="border-b border-black/10 text-muted dark:border-white/10">
            <th className="py-2 pr-2 w-10">#</th>
            <th className="py-2 pr-3">개입 과제</th>
            <th className="py-2 pr-3">근거</th>
            <th className="py-2 pr-3">출처</th>
            <th className="py-2">액션</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.priority} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 pr-2 font-bold text-gold">{p.priority}</td>
              <td className="py-2 pr-3 font-medium text-foreground">{p.title}</td>
              <td className="py-2 pr-3 text-muted report-prose max-w-[200px]">{p.rationale}</td>
              <td className="py-2 pr-3 text-muted">{sourceLabel[p.source] ?? p.source}</td>
              <td className="py-2 text-foreground report-prose">{p.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

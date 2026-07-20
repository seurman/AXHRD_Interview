"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MemberCompetencySeriesPoint } from "@/lib/org/people-dashboard";

const PALETTE = [
  "var(--color-primary)",
  "var(--color-gold)",
  "var(--color-accent)",
  "#059669",
  "#db2777",
  "#0891b2",
  "#7c3aed",
  "#ea580c",
];

export function CompetencyTrendChart({
  series,
  emptyHint,
}: {
  series: MemberCompetencySeriesPoint[];
  emptyHint: string;
}) {
  const { chartData, keys } = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    const keySet = new Set<string>();
    for (const point of series) {
      const label =
        point.sessionNumber > 0
          ? `${point.sessionNumber}차`
          : point.date.slice(0, 10);
      const row = byDate.get(label) ?? { label };
      row[point.competencyLabel] = point.percentile;
      byDate.set(label, row);
      keySet.add(point.competencyLabel);
    }
    return {
      chartData: Array.from(byDate.values()),
      keys: Array.from(keySet),
    };
  }, [series]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-card-border bg-background/50 text-sm text-muted">
        {emptyHint}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
        <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-card-border)",
            borderRadius: 12,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <span className="text-[10px] text-muted">—</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const w = 64;
  const h = 22;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const rising = values[values.length - 1] >= values[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={rising ? "var(--color-success)" : "var(--color-warning)"}
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export function PeopleSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  return (
    <input
      type="search"
      value={local}
      onChange={(e) => {
        setLocal(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="이름·이메일 검색"
      className="min-h-11 w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary sm:max-w-xs"
    />
  );
}

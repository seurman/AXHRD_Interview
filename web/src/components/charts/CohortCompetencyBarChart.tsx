"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { competencyLabel } from "@/lib/labels";

export type CohortCompetencyPoint = {
  competency: string;
  avgPercentile: number;
  memberCount: number;
};

const TOOLTIP_STYLE = {
  background: "var(--color-card)",
  border: "1px solid var(--color-card-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-foreground)",
  boxShadow: "var(--shadow-luxe)",
};

/** 기관·관리자 코호트 역량 분포 — 호버 툴팁 인터랙티브 바 차트 */
export function CohortCompetencyBarChart({
  items,
  emptyHint = "아직 면접 데이터가 없습니다.",
  height,
}: {
  items: CohortCompetencyPoint[];
  emptyHint?: string;
  height?: number;
}) {
  if (items.length === 0) {
    return <p className="mt-6 text-sm text-muted">{emptyHint}</p>;
  }

  const data = [...items]
    .sort((a, b) => a.avgPercentile - b.avgPercentile)
    .map((c) => ({
      name: competencyLabel(c.competency),
      percentile: Math.round(c.avgPercentile),
      members: c.memberCount,
      code: c.competency,
    }));

  const chartHeight = height ?? Math.max(220, data.length * 36 + 24);

  return (
    <div className="mt-2 w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-gold) 12%, transparent)" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, _name, item) => {
              const members = (item?.payload as { members?: number } | undefined)?.members;
              return [
                `${value}%${members != null ? ` · ${members}명` : ""}`,
                "평균 백분위",
              ];
            }}
            labelStyle={{ color: "var(--color-muted)", fontWeight: 600 }}
          />
          <Bar dataKey="percentile" radius={[0, 6, 6, 0]} maxBarSize={18} animationDuration={700}>
            {data.map((entry) => (
              <Cell
                key={entry.code}
                fill="var(--color-gold)"
                fillOpacity={0.55 + (entry.percentile / 100) * 0.45}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { TOOLTIP_STYLE as chartTooltipStyle };

"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTooltipStyle } from "@/components/charts/CohortCompetencyBarChart";

export type PercentileBarItem = {
  id: string;
  label: string;
  value: number;
  /** 0–100; when false show empty bar */
  assessed?: boolean;
  deltaLabel?: string;
  deltaPositive?: boolean;
};

/** 개인 대시보드·코칭용 가로 퍼센타일 바 (호버 툴팁) */
export function InteractivePercentileBars({
  items,
  fill = "var(--color-primary)",
  emptyHint,
  height,
}: {
  items: PercentileBarItem[];
  fill?: string;
  emptyHint?: string;
  height?: number;
}) {
  if (items.length === 0) {
    return emptyHint ? <p className="text-sm text-muted">{emptyHint}</p> : null;
  }

  const data = items.map((item) => ({
    ...item,
    value: item.assessed === false ? 0 : Math.min(100, Math.max(0, Math.round(item.value))),
  }));

  const chartHeight = height ?? Math.max(160, data.length * 40 + 8);

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            hide
          />
          <YAxis
            type="category"
            dataKey="label"
            width={92}
            tick={{ fill: "var(--color-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "color-mix(in srgb, var(--color-gold) 10%, transparent)" }}
            contentStyle={chartTooltipStyle}
            formatter={(value: number, _n, ctx) => {
              const payload = ctx?.payload as PercentileBarItem | undefined;
              if (payload?.assessed === false) return ["미측정", "점수"];
              const delta = payload?.deltaLabel
                ? ` (${payload.deltaLabel})`
                : "";
              return [`${value}%${delta}`, "점수"];
            }}
          />
          <Bar
            dataKey="value"
            fill={fill}
            radius={[0, 6, 6, 0]}
            maxBarSize={14}
            background={{ fill: "var(--color-background)", radius: 6 }}
            animationDuration={650}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { chartTooltipStyle } from "@/components/charts/CohortCompetencyBarChart";

export type RoundCompetencyRadarPoint = {
  competency: string;
  label: string;
  percentile: number;
};

/** 차수 완료 — 역량별 백분위 레이더 */
export function RoundCompetencyRadar({
  points,
}: {
  points: RoundCompetencyRadarPoint[];
}) {
  if (points.length === 0) return null;
  const data = points.map((p) => ({
    axis: p.label,
    value: Math.round(p.percentile),
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <defs>
            <linearGradient id="roundCompetencyFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.25} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="var(--color-card-border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number) => [`${value}%`, "백분위"]}
          />
          <Radar
            name="percentile"
            dataKey="value"
            stroke="var(--color-gold)"
            fill="url(#roundCompetencyFill)"
            fillOpacity={1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

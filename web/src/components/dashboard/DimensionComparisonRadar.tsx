"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  ANSWER_DIMENSION_KEYS,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";

type RadarRow = {
  axis: string;
  recent: number;
  previous: number;
};

export function DimensionComparisonRadar({
  recent,
  previous,
  recentLegend,
  previousLegend,
}: {
  recent: AnswerDimensions;
  previous: AnswerDimensions;
  recentLegend: string;
  previousLegend: string;
}) {
  const chartData = useMemo<RadarRow[]>(
    () =>
      ANSWER_DIMENSION_KEYS.map((key) => ({
        axis: dimensionLabel(key),
        recent: Math.round(recent[key] * 100),
        previous: Math.round(previous[key] * 100),
      })),
    [recent, previous],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded bg-gold" />
          {recentLegend}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded border border-dashed border-muted bg-transparent" />
          {previousLegend}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
          <defs>
            <linearGradient id="dashboardDimensionRecent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="var(--color-card-border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <Radar
            name={previousLegend}
            dataKey="previous"
            stroke="var(--color-muted)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            fill="none"
            fillOpacity={0}
            dot={false}
          />
          <Radar
            name={recentLegend}
            dataKey="recent"
            stroke="var(--color-gold)"
            strokeWidth={2}
            fill="url(#dashboardDimensionRecent)"
            fillOpacity={1}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

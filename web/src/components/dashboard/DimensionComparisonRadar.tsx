"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ANSWER_DIMENSION_KEYS,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";
import { chartTooltipStyle } from "@/components/charts/CohortCompetencyBarChart";

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
  placeholder = false,
  placeholderHint,
}: {
  recent: AnswerDimensions;
  previous: AnswerDimensions;
  recentLegend: string;
  previousLegend: string;
  placeholder?: boolean;
  placeholderHint?: string;
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

      <div className={placeholder ? "relative" : undefined}>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <defs>
              <linearGradient id="dashboardDimensionRecent" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={placeholder ? 0.15 : 0.5} />
                <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={placeholder ? 0.08 : 0.3} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="var(--color-card-border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "var(--color-muted)", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number, name: string) => [`${value}%`, name]}
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
              strokeOpacity={placeholder ? 0.35 : 1}
            />
            <Radar
              name={recentLegend}
              dataKey="recent"
              stroke="var(--color-gold)"
              strokeWidth={2}
              fill="url(#dashboardDimensionRecent)"
              fillOpacity={1}
              strokeOpacity={placeholder ? 0.35 : 1}
              isAnimationActive
            />
          </RadarChart>
        </ResponsiveContainer>
        {placeholder && placeholderHint && (
          <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-xs text-muted">
            {placeholderHint}
          </p>
        )}
      </div>
    </div>
  );
}

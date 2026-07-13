"use client";

import { useMemo } from "react";
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
import {
  ANSWER_DIMENSION_KEYS,
  type AnswerDimensionKey,
} from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";
import type { DimensionSessionPoint } from "@/lib/dashboard/dimension-timeline";

const SERIES_COLORS: Record<AnswerDimensionKey, string> = {
  questionIntent: "var(--color-primary)",
  situationSpecificity: "var(--color-gold)",
  individualOwnership: "var(--color-accent)",
  logic: "#6366f1",
  outcomeQuantification: "#10b981",
  delivery: "#f59e0b",
};

export function DimensionTimeSeriesChart({
  timeline,
  emptyHint,
}: {
  timeline: DimensionSessionPoint[];
  emptyHint: string;
}) {
  const chartData = useMemo(
    () =>
      timeline.map((p) => {
        const row: Record<string, string | number> = {
          session: `${p.sessionNumber}차`,
        };
        for (const key of ANSWER_DIMENSION_KEYS) {
          row[key] = Math.round(p.dimensions[key] * 100);
        }
        return row;
      }),
    [timeline],
  );

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-card-border bg-background/40 text-center text-sm text-muted">
        <p>{emptyHint}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2 px-4">
          {ANSWER_DIMENSION_KEYS.map((key) => (
            <span
              key={key}
              className="rounded-full bg-muted/10 px-2 py-0.5 text-[10px] text-muted"
            >
              {dimensionLabel(key)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
        <XAxis dataKey="session" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "var(--color-muted)", fontSize: 11 }}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-card-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => [
            `${value}%`,
            dimensionLabel(name as AnswerDimensionKey),
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
          formatter={(value) => dimensionLabel(value as AnswerDimensionKey)}
        />
        {ANSWER_DIMENSION_KEYS.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={key}
            stroke={SERIES_COLORS[key]}
            strokeWidth={chartData.length >= 3 ? 2 : 1.5}
            dot={{ r: chartData.length >= 3 ? 3 : 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
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
  type AnswerDimensionKey,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";
import { chartTooltipStyle } from "@/components/charts/CohortCompetencyBarChart";

type RadarRow = {
  axis: string;
  key: AnswerDimensionKey;
  value: number;
  average?: number;
};

function CustomAngleTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  weakestLabel: string;
}) {
  const { x = 0, y = 0, payload, weakestLabel } = props;
  const label = payload?.value ?? "";
  const isWeak = label === weakestLabel;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={isWeak ? "var(--color-warning)" : "var(--color-muted)"}
      fontSize={11}
      fontWeight={isWeak ? 600 : 400}
    >
      {label}
    </text>
  );
}

export function AnswerInsightRadar({
  dimensions,
  weakestDimension,
  sessionAverage,
}: {
  dimensions: AnswerDimensions;
  weakestDimension?: string;
  sessionAverage?: AnswerDimensions | null;
}) {
  const weakestKey =
    (weakestDimension as AnswerDimensionKey | undefined) ??
    ANSWER_DIMENSION_KEYS.reduce((min, key) =>
      dimensions[key] < dimensions[min] ? key : min
    , ANSWER_DIMENSION_KEYS[0]);
  const weakestLabel = dimensionLabel(weakestKey);

  const chartData = useMemo<RadarRow[]>(
    () =>
      ANSWER_DIMENSION_KEYS.map((key) => ({
        axis: dimensionLabel(key),
        key,
        value: Math.round(dimensions[key] * 100),
        average: sessionAverage ? Math.round(sessionAverage[key] * 100) : undefined,
      })),
    [dimensions, sessionAverage]
  );

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, scale: 0.35 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.8 }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          6축 인사이트
        </p>
        {sessionAverage && (
          <p className="text-[10px] text-muted">
            실선 · 이번 답변 / 점선 · 세션 평균
          </p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
          <defs>
            <linearGradient id="answerInsightGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="var(--color-card-border)" />
          <PolarAngleAxis
            dataKey="axis"
            tick={(tickProps) => (
              <CustomAngleTick {...tickProps} weakestLabel={weakestLabel} />
            )}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number, name: string) => [`${value}%`, name]}
          />
          {sessionAverage && (
            <Radar
              name="세션 평균"
              dataKey="average"
              stroke="var(--color-muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              fill="none"
              fillOpacity={0}
              dot={false}
            />
          )}
          <Radar
            name="이번 답변"
            dataKey="value"
            stroke="var(--color-gold)"
            strokeWidth={2}
            fill="url(#answerInsightGradient)"
            fillOpacity={1}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>

      <p className="text-center text-xs text-warning">
        이번 답변에서 가장 보완할 부분: {weakestLabel}
      </p>
    </motion.div>
  );
}

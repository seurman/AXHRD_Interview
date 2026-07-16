"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ARC_RADAR_DOMAIN, ARC_SCALE_MAX, formatScore } from "@/lib/diagnostic/format-score";

export type ArcRadarPoint = { axis: string; value: number };

type Props = {
  data: ArcRadarPoint[];
  /** second series optional (e.g. OAI contribution overlay) */
  fill?: string;
  stroke?: string;
  fillOpacity?: number;
  heightClass?: string;
  caption?: string;
};

/**
 * Fixed 0–5 radius domain so typical 3.x–4.x scores don’t auto-scale to “full”.
 * Survey Likert remains 1–5; this is display only.
 */
export function ArcRadar({
  data,
  fill = "#c9a227",
  stroke = "#c9a227",
  fillOpacity = 0.22,
  heightClass = "h-64",
  caption = `만점 ${ARC_SCALE_MAX.toFixed(1)} · 척도 고정`,
}: Props) {
  return (
    <div>
      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="currentColor" className="text-foreground/10" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: "currentColor" }} className="text-muted" />
            <PolarRadiusAxis
              type="number"
              domain={ARC_RADAR_DOMAIN}
              ticks={[0, 1, 2, 3, 4, 5]}
              tickCount={6}
              allowDataOverflow
              tick={{ fontSize: 10, fill: "currentColor" }}
              tickFormatter={(v: number) => formatScore(v)}
              className="text-muted"
              axisLine={false}
            />
            <Tooltip
              formatter={(v: number) => [formatScore(v), "점수"]}
              contentStyle={{ fontSize: 12 }}
            />
            <Radar
              dataKey="value"
              stroke={stroke}
              fill={fill}
              fillOpacity={fillOpacity}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-center text-[10px] text-muted">{caption}</p>
    </div>
  );
}

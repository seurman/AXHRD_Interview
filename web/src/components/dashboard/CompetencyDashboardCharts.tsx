"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import type { DotProps } from "recharts";
import { chartTooltipStyle } from "@/components/charts/CohortCompetencyBarChart";
import { DimensionComparisonRadar } from "./DimensionComparisonRadar";
import { DimensionTimeSeriesChart } from "./DimensionTimeSeriesChart";
import {
  compareDimensionHalves,
  type DimensionSessionPoint,
} from "@/lib/dashboard/dimension-timeline";

type RadarPoint = {
  competency: string;
  score: number;
  code: string;
  assessed: boolean;
};

type TimelinePoint = { session: string; theta: number };

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-luxe p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function AssessedRadarDot(props: DotProps & { payload?: RadarPoint }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const assessed = payload?.assessed !== false;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={assessed ? 4 : 3}
      fill={assessed ? "var(--color-primary)" : "var(--color-muted)"}
      fillOpacity={assessed ? 1 : 0.4}
      stroke={assessed ? "var(--color-primary)" : "var(--color-muted)"}
      strokeWidth={assessed ? 2 : 1}
      strokeDasharray={assessed ? undefined : "2 2"}
    />
  );
}

/** Heavy Recharts islands — loaded via next/dynamic so the shell paints first. */
export function CompetencyDashboardCharts({
  radarData,
  assessedCount,
  timelineData,
  showGrowthTrendLine,
  dimensionTimeline,
  labels,
}: {
  radarData: RadarPoint[];
  assessedCount: number;
  timelineData: TimelinePoint[];
  showGrowthTrendLine: boolean;
  dimensionTimeline: DimensionSessionPoint[];
  labels: {
    radar: string;
    radarMeasuredCount: string;
    radarEmpty: string;
    growth: string;
    growthTrendHint: string;
    growthEmpty: string;
    dimensionTrend: {
      timeSeriesTitle: string;
      timeSeriesHint: string;
      timeSeriesEmpty: string;
      title: string;
      comparison: string;
      comparisonEmpty: string;
      recentLegend: string;
      previousLegend: string;
      empty: string;
    };
  };
}) {
  const dimensionComparison = compareDimensionHalves(dimensionTimeline);
  const st = labels;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={st.radar}
          hint={
            assessedCount < 3
              ? st.radarMeasuredCount.replace("{count}", String(assessedCount))
              : undefined
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-card-border)" />
              <PolarAngleAxis
                dataKey="competency"
                tick={{ fill: "var(--color-muted)", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number) => [`${value}%`, "백분위"]}
              />
              <Radar
                dataKey="score"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={assessedCount > 0 ? 0.3 : 0.08}
                strokeOpacity={assessedCount > 0 ? 1 : 0.35}
                dot={<AssessedRadarDot />}
                isAnimationActive={false}
              />
            </RadarChart>
          </ResponsiveContainer>
          {assessedCount === 0 && (
            <p className="mt-2 text-center text-xs text-muted">{st.radarEmpty}</p>
          )}
        </ChartCard>

        <ChartCard
          title={st.growth}
          hint={!showGrowthTrendLine && timelineData.length > 0 ? st.growthTrendHint : undefined}
        >
          {timelineData.length === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-card-border bg-background/40 text-center text-sm text-muted">
              <p>{st.growthEmpty}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
                <XAxis dataKey="session" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <YAxis domain={[-2, 2]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-card-border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="theta"
                  stroke="var(--color-gold)"
                  strokeWidth={showGrowthTrendLine ? 2 : 1.5}
                  dot={{ r: 5, fill: "var(--color-gold)" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title={st.dimensionTrend.timeSeriesTitle}
        hint={
          dimensionTimeline.length >= 2
            ? st.dimensionTrend.timeSeriesHint.replace(
                "{count}",
                String(dimensionTimeline.length),
              )
            : st.dimensionTrend.timeSeriesEmpty
        }
      >
        <DimensionTimeSeriesChart
          timeline={dimensionTimeline}
          emptyHint={st.dimensionTrend.timeSeriesEmpty}
        />
      </ChartCard>

      <ChartCard
        title={st.dimensionTrend.title}
        hint={
          dimensionComparison
            ? st.dimensionTrend.comparison
                .replace("{recent}", String(dimensionComparison.recentSessionCount))
                .replace("{previous}", String(dimensionComparison.previousSessionCount))
            : st.dimensionTrend.comparisonEmpty
        }
      >
        {dimensionComparison ? (
          <DimensionComparisonRadar
            recent={dimensionComparison.recent}
            previous={dimensionComparison.previous}
            recentLegend={st.dimensionTrend.recentLegend}
            previousLegend={st.dimensionTrend.previousLegend}
          />
        ) : (
          <DimensionComparisonRadar
            recent={ZERO_DIMENSIONS}
            previous={ZERO_DIMENSIONS}
            recentLegend={st.dimensionTrend.recentLegend}
            previousLegend={st.dimensionTrend.previousLegend}
            placeholder
            placeholderHint={st.dimensionTrend.empty}
          />
        )}
      </ChartCard>
    </div>
  );
}

const ZERO_DIMENSIONS = {
  questionIntent: 0,
  situationSpecificity: 0,
  individualOwnership: 0,
  logic: 0,
  outcomeQuantification: 0,
  delivery: 0,
} as const;

export default CompetencyDashboardCharts;

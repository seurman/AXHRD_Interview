"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { competencyLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DimensionSessionPoint } from "@/lib/dashboard/dimension-timeline";
import { QuestPanel } from "./QuestPanel";
import { StrengthCardDeck } from "@/components/profile/StrengthCardDeck";
import { LearningPathCard } from "./LearningPathCard";
import type { QuestItem } from "./QuestPanel";
import type { DiscoverInterviewAdvice, DiscoverStrengthItem } from "@/types/discover";
import type { PathCompetencySummary } from "@/lib/learning/path";
import type { WeaknessRecommendation } from "@/lib/learning/weakness";

const CompetencyDashboardCharts = dynamic(
  () => import("./CompetencyDashboardCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6" aria-hidden>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card-luxe h-[320px] animate-pulse bg-card/40" />
          <div className="card-luxe h-[320px] animate-pulse bg-card/40" />
        </div>
        <div className="card-luxe h-[280px] animate-pulse bg-card/40" />
      </div>
    ),
  },
);

interface Snapshot {
  competency: string;
  theta: number;
  percentile: number;
  recordedAt: string;
  sessionNumber: number;
}

type CompetencyLatest = {
  theta: number;
  percentile: number;
  levelEst: number;
  assessed: boolean;
  unlockedStage?: number;
  masteryScore?: number;
  pathCertified?: boolean;
};

interface DashboardProps {
  snapshots: Snapshot[];
  latestByCompetency: Record<string, CompetencyLatest>;
  sessionCount: number;
  dimensionTimeline: DimensionSessionPoint[];
  quests: QuestItem[];
  totalXp: number;
  level: number;
  strengthDeck?: {
    strengths: DiscoverStrengthItem[];
    interviewAdvice: DiscoverInterviewAdvice[];
    totalDiscovered: number;
    reportHref: string;
  } | null;
  learningPath?: {
    weakness: WeaknessRecommendation;
    competencies: PathCompetencySummary[];
  } | null;
  readOnly?: boolean;
  showOnboardingBanner?: boolean;
}

const LEVEL_COLORS = [
  "text-muted",
  "text-sky-600",
  "text-emerald-600",
  "text-amber-600",
  "text-orange-600",
  "text-rose-600",
];

export function CompetencyDashboard({
  snapshots,
  latestByCompetency,
  sessionCount,
  dimensionTimeline,
  quests,
  totalXp,
  level,
  strengthDeck,
  learningPath = null,
  readOnly = false,
  showOnboardingBanner = false,
}: DashboardProps) {
  const { dict } = useI18n();
  const diff = dict.dashboard.differentiation;
  const st = dict.dashboard.stats;

  const assessed = Object.entries(latestByCompetency).filter(([, v]) => v.assessed);

  const radarData = Object.entries(latestByCompetency).map(([code, v]) => ({
    competency: competencyLabel(code),
    score: v.assessed ? v.percentile : 0,
    code,
    assessed: v.assessed,
  }));
  const assessedCount = radarData.filter((d) => d.assessed).length;

  const timelineData = buildTimeline(snapshots);
  const showGrowthTrendLine = timelineData.length >= 3;
  const avgPercentile =
    assessed.length === 0
      ? 0
      : assessed.reduce((s, [, v]) => s + v.percentile, 0) / assessed.length;

  const sorted = [...assessed].sort((a, b) => b[1].percentile - a[1].percentile);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const growthDelta =
    timelineData.length >= 2
      ? timelineData[timelineData.length - 1].theta - timelineData[0].theta
      : 0;

  return (
    <div className="space-y-8">
      {showOnboardingBanner && (
        <div className="card-luxe flex flex-col gap-4 border-dashed border-gold/30 bg-gold/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">{st.onboarding.title}</p>
            <p className="mt-1 text-sm text-muted">{st.onboarding.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/interview/setup" className="btn-primary text-sm">
              {st.onboarding.ctaInterview}
            </Link>
            <Link href="/demo#trial" className="btn-secondary text-sm">
              {st.onboarding.ctaTrial}
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={st.careerLevel} value={`Lv.${level}`} sub={`${totalXp} XP`} accent />
        <StatCard label={st.sessions} value={`${sessionCount}`} sub="IRT" />
        <StatCard
          label={st.avgPercentile}
          value={assessed.length > 0 ? `${Math.round(avgPercentile)}%` : "—"}
          sub={
            timelineData.length >= 2
              ? growthDelta >= 0
                ? `θ +${growthDelta.toFixed(2)}`
                : `θ ${growthDelta.toFixed(2)}`
              : st.avgPercentileBasis
          }
          hint={assessed.length > 0 ? st.avgPercentileBasis : undefined}
        />
        <StatCard
          label={st.strongest}
          value={strongest ? competencyLabel(strongest[0]) : "—"}
          sub={weakest ? `${st.improve}: ${competencyLabel(weakest[0])}` : st.onboarding.skillTreeHint}
        />
      </div>

      <div className={`grid gap-6 ${readOnly ? "" : "lg:grid-cols-3"}`}>
        <div className={`space-y-6 ${readOnly ? "" : "lg:col-span-2"}`}>
          <CompetencyDashboardCharts
            radarData={radarData}
            assessedCount={assessedCount}
            timelineData={timelineData}
            showGrowthTrendLine={showGrowthTrendLine}
            dimensionTimeline={dimensionTimeline}
            labels={{
              radar: st.radar,
              radarMeasuredCount: st.radarMeasuredCount,
              radarEmpty: st.radarEmpty,
              growth: st.growth,
              growthTrendHint: st.growthTrendHint,
              growthEmpty: st.growthEmpty,
              dimensionTrend: st.dimensionTrend,
            }}
          />

          <div className="card-luxe p-6">
            <h3 className="mb-1 font-semibold text-foreground">{st.skillTree}</h3>
            <p className="mb-4 text-xs text-muted">{st.onboarding.skillTreeHint}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(latestByCompetency).map(([code, v]) => (
                <CompetencySkillBar key={code} code={code} {...v} />
              ))}
            </div>
          </div>

          {strengthDeck && Array.isArray(strengthDeck.strengths) && (
            <div className="space-y-2">
              <p className="text-sm text-muted">{st.strengthDeckNote}</p>
              <StrengthCardDeck
                strengths={strengthDeck.strengths.slice(0, 3)}
                interviewAdvice={Array.isArray(strengthDeck.interviewAdvice)
                  ? strengthDeck.interviewAdvice
                  : []}
                totalDiscovered={strengthDeck.totalDiscovered}
                reportHref={strengthDeck.reportHref}
                compact
              />
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="space-y-6">
            {learningPath ? (
              <LearningPathCard
                weakness={learningPath.weakness}
                pathSummary={learningPath.competencies}
              />
            ) : null}
            <QuestPanel quests={quests} totalXp={totalXp} level={level} />

            <div className="card-luxe p-5">
              <h3 className="font-semibold text-foreground">{diff.title}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                {diff.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/discover" className="mt-4 block text-sm font-medium text-primary hover:underline">
                {diff.link}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompetencySkillBar({
  code,
  levelEst,
  percentile,
  theta,
  assessed,
  unlockedStage = 0,
  masteryScore = 0,
  pathCertified = false,
}: {
  code: string;
  levelEst: number;
  percentile: number;
  theta: number;
  assessed: boolean;
  unlockedStage?: number;
  masteryScore?: number;
  pathCertified?: boolean;
}) {
  const color = assessed
    ? (LEVEL_COLORS[Math.min(levelEst, 5)] ?? LEVEL_COLORS[0])
    : LEVEL_COLORS[0];

  return (
    <Link
      href={`/practice/path/${code.toLowerCase()}`}
      className={`block rounded-xl bg-background p-4 ring-1 ring-inset ring-card-border/50 transition hover:ring-accent/40 ${!assessed ? "opacity-80" : ""}`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{competencyLabel(code)}</span>
        <span className={`font-bold ${color}`}>
          {pathCertified ? "인증" : assessed ? `L${levelEst}` : "미시작"}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className={`h-full rounded-full transition-all ${
            assessed ? "bg-gradient-to-r from-primary to-gold" : "bg-muted/30"
          }`}
          style={{ width: `${assessed ? percentile : 0}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {assessed
          ? `${Math.round(percentile)}% · θ ${theta.toFixed(2)}`
          : "0% · 아직 측정하지 않음"}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">
        패스 stage {unlockedStage}/5 · 숙련 {Math.round(masteryScore * 100)}%
        {pathCertified ? " · 인증 완료" : ""}
      </p>
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  hint,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card-luxe p-5 ${accent ? "border-gold/40 bg-gold/5" : ""}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function buildTimeline(snapshots: Snapshot[]) {
  const bySession = new Map<number, { theta: number; count: number }>();
  for (const s of snapshots) {
    const cur = bySession.get(s.sessionNumber) ?? { theta: 0, count: 0 };
    cur.theta += s.theta;
    cur.count += 1;
    bySession.set(s.sessionNumber, cur);
  }
  return Array.from(bySession.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([session, { theta, count }]) => ({
      session: `${session}차`,
      theta: parseFloat((theta / count).toFixed(2)),
    }));
}

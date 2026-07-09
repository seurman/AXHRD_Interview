"use client";

import Link from "next/link";
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
import { competencyLabel } from "@/lib/labels";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { QuestPanel } from "./QuestPanel";
import { StrengthCardDeck } from "@/components/profile/StrengthCardDeck";
import type { QuestItem } from "./QuestPanel";
import type { DiscoverInterviewAdvice, DiscoverStrengthItem } from "@/types/discover";

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
};

interface DashboardProps {
  snapshots: Snapshot[];
  latestByCompetency: Record<string, CompetencyLatest>;
  sessionCount: number;
  quests: QuestItem[];
  totalXp: number;
  level: number;
  strengthDeck?: {
    strengths: DiscoverStrengthItem[];
    interviewAdvice: DiscoverInterviewAdvice[];
    totalDiscovered: number;
    reportHref: string;
  } | null;
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
  quests,
  totalXp,
  level,
  strengthDeck,
}: DashboardProps) {
  const { dict } = useI18n();
  const diff = dict.dashboard.differentiation;
  const st = dict.dashboard.stats;

  const assessed = Object.entries(latestByCompetency).filter(([, v]) => v.assessed);

  // 레이더는 전체 6역량을 보여 주되, 미시작은 0점으로 표시 (빈 축이 보이게)
  const radarData = Object.entries(latestByCompetency).map(([code, v]) => ({
    competency: competencyLabel(code),
    score: v.assessed ? v.percentile : 0,
    code,
  }));

  const timelineData = buildTimeline(snapshots);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={st.careerLevel} value={`Lv.${level}`} sub={`${totalXp} XP`} accent />
        <StatCard label={st.sessions} value={`${sessionCount}`} sub="IRT" />
        <StatCard
          label={st.avgPercentile}
          value={`${Math.round(avgPercentile)}%`}
          sub={growthDelta >= 0 ? `θ +${growthDelta.toFixed(2)}` : `θ ${growthDelta.toFixed(2)}`}
        />
        <StatCard
          label={st.strongest}
          value={strongest ? competencyLabel(strongest[0]) : "—"}
          sub={weakest ? `${st.improve}: ${competencyLabel(weakest[0])}` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title={st.radar}>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-card-border)" />
                  <PolarAngleAxis dataKey="competency" tick={{ fill: "var(--color-muted)", fontSize: 10 }} />
                  <Radar dataKey="score" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={st.growth}>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-card-border)" />
                  <XAxis dataKey="session" tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                  <YAxis domain={[-2, 2]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-card-border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="theta" stroke="var(--color-gold)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="card-luxe p-6">
            <h3 className="mb-4 font-semibold text-foreground">{st.skillTree}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(latestByCompetency).map(([code, v]) => (
                <CompetencySkillBar key={code} code={code} {...v} />
              ))}
            </div>
          </div>

          {strengthDeck && (
            <StrengthCardDeck
              strengths={strengthDeck.strengths.slice(0, 3)}
              interviewAdvice={strengthDeck.interviewAdvice}
              totalDiscovered={strengthDeck.totalDiscovered}
              reportHref={strengthDeck.reportHref}
              compact
            />
          )}
        </div>

        <div className="space-y-6">
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
}: {
  code: string;
  levelEst: number;
  percentile: number;
  theta: number;
  assessed: boolean;
}) {
  const color = assessed
    ? (LEVEL_COLORS[Math.min(levelEst, 5)] ?? LEVEL_COLORS[0])
    : LEVEL_COLORS[0];

  return (
    <div className={`rounded-xl bg-background p-4 ${!assessed ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{competencyLabel(code)}</span>
        <span className={`font-bold ${color}`}>{assessed ? `L${levelEst}` : "미시작"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className={`h-full rounded-full transition-all ${
            assessed ? "bg-gradient-to-r from-primary to-gold" : "bg-muted/40"
          }`}
          style={{ width: `${assessed ? percentile : 0}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {assessed ? `${Math.round(percentile)}% · θ ${theta.toFixed(2)}` : "0% · 아직 측정하지 않음"}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card-luxe p-5 ${accent ? "border-gold/40 bg-gold/5" : ""}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-luxe p-5">
      <h3 className="mb-4 font-semibold text-foreground">{title}</h3>
      {children}
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

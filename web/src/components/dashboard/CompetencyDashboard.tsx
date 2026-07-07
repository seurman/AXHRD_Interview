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

interface DashboardProps {
  snapshots: Snapshot[];
  latestByCompetency: Record<
    string,
    { theta: number; percentile: number; levelEst: number }
  >;
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
  const radarData = Object.entries(latestByCompetency).map(([code, v]) => ({
    competency: competencyLabel(code),
    score: v.percentile,
    code,
  }));

  const timelineData = buildTimeline(snapshots);
  const avgPercentile =
    Object.values(latestByCompetency).reduce((s, v) => s + v.percentile, 0) /
    Math.max(Object.keys(latestByCompetency).length, 1);

  const sorted = Object.entries(latestByCompetency).sort(
    (a, b) => b[1].percentile - a[1].percentile
  );
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const growthDelta =
    timelineData.length >= 2
      ? timelineData[timelineData.length - 1].theta - timelineData[0].theta
      : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="커리어 레벨" value={`Lv.${level}`} sub={`${totalXp} XP`} accent />
        <StatCard label="완료 면접" value={`${sessionCount}회`} sub="IRT 적응형" />
        <StatCard
          label="평균 백분위"
          value={`${Math.round(avgPercentile)}%`}
          sub={growthDelta >= 0 ? `θ +${growthDelta.toFixed(2)}` : `θ ${growthDelta.toFixed(2)}`}
        />
        <StatCard
          label="최강 / 취약"
          value={strongest ? competencyLabel(strongest[0]) : "—"}
          sub={weakest ? `보완: ${competencyLabel(weakest[0])}` : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="역량 레이더">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e8e4dc" />
                  <PolarAngleAxis dataKey="competency" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#3d7ea6" fill="#3d7ea6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="θ 성장 곡선">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
                  <XAxis dataKey="session" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis domain={[-2, 2]} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e8e4dc", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="theta" stroke="#c9a227" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="card-luxe p-6">
            <h3 className="mb-4 font-semibold text-foreground">역량 스킬 트리</h3>
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
            <h3 className="font-semibold text-foreground">AX-HRD 차별점</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>🎯 IRT로 면접관이 아닌 <strong className="text-foreground">데이터</strong>가 난이도 조절</li>
              <li>🃏 자기발견 강점 → 역량 면접 <strong className="text-foreground">브릿지</strong></li>
              <li>📊 장기 θ 추적으로 <strong className="text-foreground">성장 스토리</strong> 증명</li>
            </ul>
            <Link href="/discover" className="mt-4 block text-sm font-medium text-primary hover:underline">
              강점 카드 더 모으기 →
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
}: {
  code: string;
  levelEst: number;
  percentile: number;
  theta: number;
}) {
  const color = LEVEL_COLORS[Math.min(levelEst, 5)] ?? LEVEL_COLORS[0];

  return (
    <div className="rounded-xl bg-background p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{competencyLabel(code)}</span>
        <span className={`font-bold ${color}`}>L{levelEst}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all"
          style={{ width: `${percentile}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {percentile}% · θ {theta.toFixed(2)}
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

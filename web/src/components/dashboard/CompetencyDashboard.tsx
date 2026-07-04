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
import { competencyLabel } from "@/lib/labels";

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
}

export function CompetencyDashboard({
  snapshots,
  latestByCompetency,
  sessionCount,
}: DashboardProps) {
  const radarData = Object.entries(latestByCompetency).map(([code, v]) => ({
    competency: competencyLabel(code),
    score: v.percentile,
  }));

  const timelineData = buildTimeline(snapshots);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="완료 차수" value={`${sessionCount}회`} />
        <StatCard
          label="평균 θ"
          value={
            Object.values(latestByCompetency).length
              ? (
                  Object.values(latestByCompetency).reduce(
                    (s, v) => s + v.theta,
                    0
                  ) / Object.values(latestByCompetency).length
                ).toFixed(2)
              : "—"
          }
        />
        <StatCard
          label="최고 역량"
          value={
            Object.entries(latestByCompetency).sort(
              (a, b) => b[1].theta - a[1].theta
            )[0]?.[0]
              ? competencyLabel(
                  Object.entries(latestByCompetency).sort(
                    (a, b) => b[1].theta - a[1].theta
                  )[0][0]
                )
              : "—"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="역량 레이더 (최신)">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e8e4dc" />
              <PolarAngleAxis dataKey="competency" tick={{ fill: "#64748b", fontSize: 11 }} />
              <Radar
                dataKey="score"
                stroke="#3d7ea6"
                fill="#3d7ea6"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="θ 변화 추이">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e4dc" />
              <XAxis dataKey="session" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis domain={[-2, 2]} tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e8e4dc",
                  borderRadius: 8,
                }}
              />
              <Line type="monotone" dataKey="theta" stroke="#3d7ea6" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="card-luxe p-6">
        <h3 className="mb-4 font-semibold text-foreground">역량별 현재 수준</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(latestByCompetency).map(([code, v]) => (
            <div
              key={code}
              className="flex items-center justify-between rounded-lg bg-background px-4 py-3"
            >
              <span className="text-foreground">{competencyLabel(code)}</span>
              <span className="text-sm text-muted">
                L{v.levelEst} · θ {v.theta.toFixed(2)} · {v.percentile}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-luxe p-5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

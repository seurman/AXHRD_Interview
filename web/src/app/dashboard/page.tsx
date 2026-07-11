import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { RecentActivityPanel, type ActivityItem } from "@/components/dashboard/RecentActivityPanel";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { competencyLabel } from "@/lib/labels";
import { COMPETENCY_CODES } from "@/types";
import { getUserStrengthDeck } from "@/lib/discover/user-strengths";
import { buildCareerQuests } from "@/lib/dashboard/quests";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      sessions: { where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 6 },
      competencyLogs: { orderBy: { recordedAt: "asc" } },
      selfDiscoverySessions: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 4,
      },
      resumeReviews: { orderBy: { createdAt: "desc" }, take: 4 },
    },
  });

  if (!full) redirect("/auth/login");

  const strengthDeck = await getUserStrengthDeck(user.id);

  const sessionIds = [...new Set(full.competencyLogs.map((log) => log.sessionId))];
  const sessions =
    sessionIds.length > 0
      ? await prisma.interviewSession.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, sessionNumber: true },
        })
      : [];
  const sessionNumberById = new Map(sessions.map((s) => [s.id, s.sessionNumber]));

  const snapshots = full.competencyLogs.map((log) => ({
    competency: log.competency,
    theta: log.theta,
    percentile: log.percentile,
    recordedAt: log.recordedAt.toISOString(),
    sessionNumber: sessionNumberById.get(log.sessionId) ?? 0,
  }));

  const latestByCompetency: Record<
    string,
    { theta: number; percentile: number; levelEst: number; assessed: boolean }
  > = {};

  for (const log of [...full.competencyLogs].reverse()) {
    if (!latestByCompetency[log.competency]) {
      latestByCompetency[log.competency] = {
        theta: log.theta,
        percentile: log.percentile,
        levelEst: log.levelEst,
        assessed: true,
      };
    }
  }

  // 미시도는 IRT prior(θ=0 → 50%)가 아니라 UI상 0% · L0 · 미시작
  for (const code of COMPETENCY_CODES) {
    if (!latestByCompetency[code]) {
      latestByCompetency[code] = {
        theta: 0,
        percentile: 0,
        levelEst: 0,
        assessed: false,
      };
    }
  }

  const assessedEntries = Object.entries(latestByCompetency).filter(([, v]) => v.assessed);
  const weakest = assessedEntries.sort((a, b) => a[1].percentile - b[1].percentile)[0];

  const { quests, totalXp, level } = buildCareerQuests({
    sessionCount: full.sessions.length,
    hasDiscover: full.selfDiscoverySessions.length > 0,
    weakestCompetency: weakest ? competencyLabel(weakest[0]) : undefined,
  });

  const activityItems: ActivityItem[] = [
    ...full.sessions.map((s) => ({
      id: s.id,
      kind: "interview" as const,
      title: `모의면접 #${s.sessionNumber}`,
      subtitle: "면접 리포트 보기",
      href: `/interview/${s.id}/report`,
      completedAt: (s.completedAt ?? s.startedAt ?? s.createdAt).toISOString(),
    })),
    ...full.selfDiscoverySessions.map((s) => ({
      id: s.id,
      kind: "discover" as const,
      title: "자기발견 인터뷰",
      subtitle: "강점 리포트 보기",
      href: `/discover/${s.id}/report`,
      completedAt: (s.completedAt ?? s.startedAt).toISOString(),
    })),
    ...full.resumeReviews.map((r) => ({
      id: r.id,
      kind: "resume" as const,
      title: "자소서 첨삭",
      subtitle: "첨삭 결과 보기",
      href: `/resume-review/${r.id}`,
      completedAt: r.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">AX-HRD Career OS</p>
          <h1 className="text-2xl font-bold text-foreground">역량 트래킹</h1>
          <p className="mt-1 text-muted">
            {full.name}님 · Lv.{level} · IRT θ 기반 장기 성장 기록
          </p>
        </div>
        <div className="flex gap-2">
          {full.sessions.length > 0 && (
            <Link href="/profile/certificate" className="btn-secondary text-sm">
              역량 인증서
            </Link>
          )}
          <Link href="/interview/setup" className="btn-primary text-sm">
            + 새 면접
          </Link>
        </div>
      </div>

      {full.sessions.length === 0 && !strengthDeck ? (
        <div className="card-luxe border-dashed p-12 text-center text-muted">
          <p className="text-4xl">🚀</p>
          <p className="mt-4 font-medium text-foreground">커리어 성장 여정을 시작해 보세요</p>
          <p className="mt-2 text-sm">
            자기발견으로 강점 카드를 모으고, IRT 면접으로 역량을 증명하세요.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/discover" className="rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-white">
              나를 발견하기
            </Link>
            <Link href="/interview/setup" className="rounded-xl border border-card-border px-5 py-2.5 text-sm font-medium">
              모의 면접 시작
            </Link>
          </div>
        </div>
      ) : (
        <CompetencyDashboard
          snapshots={snapshots}
          latestByCompetency={latestByCompetency}
          sessionCount={full.sessions.length}
          quests={quests}
          totalXp={totalXp}
          level={level}
          strengthDeck={
            strengthDeck
              ? {
                  strengths: strengthDeck.strengths,
                  interviewAdvice: strengthDeck.interviewAdvice,
                  totalDiscovered: strengthDeck.totalDiscovered,
                  reportHref: `/discover/${strengthDeck.sessionId}/report`,
                }
              : null
          }
        />
      )}

      <RecentActivityPanel items={activityItems} />
    </div>
  );
}

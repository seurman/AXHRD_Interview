import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { thetaToLevel } from "@/lib/utils";
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
      sessions: { where: { status: "COMPLETED" } },
      competencyLogs: { orderBy: { recordedAt: "asc" } },
      selfDiscoverySessions: { where: { status: "COMPLETED" }, take: 1 },
    },
  });

  if (!full) redirect("/auth/login");

  const strengthDeck = await getUserStrengthDeck(user.id);

  const snapshots = await Promise.all(
    full.competencyLogs.map(async (log) => {
      const session = await prisma.interviewSession.findUnique({
        where: { id: log.sessionId },
        select: { sessionNumber: true },
      });
      return {
        competency: log.competency,
        theta: log.theta,
        percentile: log.percentile,
        recordedAt: log.recordedAt.toISOString(),
        sessionNumber: session?.sessionNumber ?? 0,
      };
    })
  );

  const latestByCompetency: Record<
    string,
    { theta: number; percentile: number; levelEst: number }
  > = {};

  for (const log of [...full.competencyLogs].reverse()) {
    if (!latestByCompetency[log.competency]) {
      latestByCompetency[log.competency] = {
        theta: log.theta,
        percentile: log.percentile,
        levelEst: log.levelEst,
      };
    }
  }

  for (const code of COMPETENCY_CODES) {
    if (!latestByCompetency[code]) {
      latestByCompetency[code] = {
        theta: 0,
        percentile: 50,
        levelEst: thetaToLevel(0),
      };
    }
  }

  const weakest = Object.entries(latestByCompetency).sort(
    (a, b) => a[1].percentile - b[1].percentile
  )[0];

  const { quests, totalXp, level } = buildCareerQuests({
    sessionCount: full.sessions.length,
    hasDiscover: full.selfDiscoverySessions.length > 0,
    weakestCompetency: weakest ? competencyLabel(weakest[0]) : undefined,
  });

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
    </div>
  );
}

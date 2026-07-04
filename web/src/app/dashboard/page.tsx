import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { thetaToLevel } from "@/lib/utils";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      sessions: { where: { status: "COMPLETED" } },
      competencyLogs: { orderBy: { recordedAt: "asc" } },
    },
  });

  if (!full) redirect("/auth/login");

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

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">역량 트래킹</h1>
          <p className="mt-1 text-muted">
            {full.name}님 · IRT θ 기반 장기 성장 기록
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

      {full.sessions.length === 0 ? (
        <div className="card-luxe border-dashed p-12 text-center text-muted">
          <p>아직 완료된 면접이 없습니다.</p>
          <Link href="/interview/setup" className="mt-4 inline-block text-primary font-medium">
            첫 모의 면접 시작 →
          </Link>
        </div>
      ) : (
        <CompetencyDashboard
          snapshots={snapshots}
          latestByCompetency={latestByCompetency}
          sessionCount={full.sessions.length}
        />
      )}
    </div>
  );
}

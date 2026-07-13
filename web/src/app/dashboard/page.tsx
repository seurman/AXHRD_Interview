import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { CoachInsightsPanel } from "@/components/dashboard/CoachInsightsPanel";
import { RecentActivityPanel, type ActivityItem } from "@/components/dashboard/RecentActivityPanel";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { getCompetencyDashboardData } from "@/lib/dashboard/get-competency-dashboard-data";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const [dashboard, activitySource] = await Promise.all([
    getCompetencyDashboardData(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        sessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 6,
          select: {
            id: true,
            sessionNumber: true,
            completedAt: true,
            startedAt: true,
            createdAt: true,
          },
        },
        selfDiscoverySessions: {
          where: { status: "COMPLETED" },
          orderBy: { completedAt: "desc" },
          take: 4,
          select: { id: true, completedAt: true, startedAt: true },
        },
        resumeReviews: {
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { id: true, createdAt: true },
        },
      },
    }),
  ]);

  if (!dashboard || !activitySource) redirect("/auth/login");

  const locale = await getLocale();
  const d = getDictionary(locale).dashboard;
  const userSuffix = getDictionary(locale).common.userSuffix;

  const activityItems: ActivityItem[] = [
    ...activitySource.sessions.map((s) => ({
      id: s.id,
      kind: "interview" as const,
      title: `모의면접 #${s.sessionNumber}`,
      subtitle: "면접 리포트 보기",
      href: `/interview/${s.id}/report`,
      completedAt: (s.completedAt ?? s.startedAt ?? s.createdAt).toISOString(),
    })),
    ...activitySource.selfDiscoverySessions.map((s) => ({
      id: s.id,
      kind: "discover" as const,
      title: "자기발견 인터뷰",
      subtitle: "강점 리포트 보기",
      href: `/discover/${s.id}/report`,
      completedAt: (s.completedAt ?? s.startedAt).toISOString(),
    })),
    ...activitySource.resumeReviews.map((r) => ({
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
          <h1 className="text-2xl font-bold text-foreground">{d.pageTitle}</h1>
          <p className="mt-1 text-muted">
            {locale === "ko"
              ? `${activitySource.name}${userSuffix} · Lv.${dashboard.level} · ${d.pageSubtitle}`
              : `${activitySource.name} · Lv.${dashboard.level} · ${d.pageSubtitle}`}
          </p>
        </div>
        <div className="flex gap-2">
          {dashboard.sessionCount > 0 && (
            <Link href="/profile/certificate" className="btn-secondary text-sm">
              역량 인증서
            </Link>
          )}
          <Link href="/interview/setup" className="btn-primary text-sm">
            + 새 면접
          </Link>
        </div>
      </div>

      {!dashboard.hasDashboardContent ? (
        <div className="card-luxe border-dashed p-12 text-center text-muted">
          <p className="text-4xl">🎤</p>
          <p className="mt-4 font-medium text-foreground">첫 모의 면접으로 역량 기록을 시작하세요</p>
          <p className="mt-2 text-sm">
            맛보기에서 피드백을 받으셨다면, 음성 면접으로 이어가 보세요.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/interview/setup" className="rounded-xl bg-gold px-5 py-2.5 text-sm font-medium text-white">
              음성 면접 시작
            </Link>
            <Link href="/demo#trial" className="rounded-xl border border-card-border px-5 py-2.5 text-sm font-medium">
              1문항 맛보기
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-foreground">{d.competencySection}</h2>
          <CompetencyDashboard
            snapshots={dashboard.snapshots}
            latestByCompetency={dashboard.latestByCompetency}
            sessionCount={dashboard.sessionCount}
            dimensionTimeline={dashboard.dimensionTimeline}
            quests={dashboard.quests}
            totalXp={dashboard.totalXp}
            level={dashboard.level}
            strengthDeck={dashboard.strengthDeck}
          />
          <h2 className="text-lg font-semibold text-foreground">{d.coachInsights.sectionTitle}</h2>
          <CoachInsightsPanel {...dashboard.coachInsights} />
        </>
      )}

      <RecentActivityPanel items={activityItems} />
    </div>
  );
}

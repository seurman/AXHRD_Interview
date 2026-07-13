import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { CoachInsightsPanel } from "@/components/dashboard/CoachInsightsPanel";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { NarrativeLead } from "@/components/dashboard/NarrativeLead";
import { getCompetencyDashboardData } from "@/lib/dashboard/get-competency-dashboard-data";
import { buildDashboardNarrative } from "@/lib/dashboard/career-narrative";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const dashboard = await getCompetencyDashboardData(user.id);
  if (!dashboard) redirect("/auth/login");

  const locale = await getLocale();
  const d = getDictionary(locale).dashboard;
  const userSuffix = getDictionary(locale).common.userSuffix;

  const assessedCount = COMPETENCY_CODES.filter(
    (c) => dashboard.latestByCompetency[c]?.assessed,
  ).length;
  const weakestEntry = COMPETENCY_CODES.map((c) => ({
    code: c,
    percentile: dashboard.latestByCompetency[c]?.percentile ?? 0,
    assessed: dashboard.latestByCompetency[c]?.assessed ?? false,
  }))
    .filter((r) => r.assessed)
    .sort((a, b) => a.percentile - b.percentile)[0];
  const deltas = dashboard.coachInsights.competencyDeltas
    .map((d) => d.delta)
    .filter((d): d is number => d != null);
  const growthDelta =
    deltas.length > 0 ? deltas.reduce((s, d) => s + d, 0) / deltas.length : null;
  const dashboardNarrative = buildDashboardNarrative({
    sessionCount: dashboard.sessionCount,
    assessedCount,
    weakestCode: weakestEntry?.code ?? null,
    growthDelta,
    latestDimensions: dashboard.coachInsights.latestDimensions,
    recentRound: dashboard.coachInsights.recentRounds[0] ?? null,
  });

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
              ? `${dashboard.userName}${userSuffix} · Lv.${dashboard.level} · ${d.pageSubtitle}`
              : `${dashboard.userName} · Lv.${dashboard.level} · ${d.pageSubtitle}`}
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

      <NarrativeLead text={dashboardNarrative} />

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
        showOnboardingBanner={!dashboard.hasDashboardContent}
      />

      <h2 className="text-lg font-semibold text-foreground">{d.coachInsights.sectionTitle}</h2>
      <CoachInsightsPanel {...dashboard.coachInsights} />
    </div>
  );
}

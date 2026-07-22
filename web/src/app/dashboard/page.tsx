import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { CoachInsightsPanel } from "@/components/dashboard/CoachInsightsPanel";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { NarrativeLead } from "@/components/dashboard/NarrativeLead";
import { QuadScopePanel } from "@/components/quadscope/QuadScopePanel";
import { rollupQuadScope, QUADSCOPE_PRODUCT } from "@/lib/quadscope";
import { getCompetencyDashboardData } from "@/lib/dashboard/get-competency-dashboard-data";
import { buildDashboardNarrative } from "@/lib/dashboard/career-narrative";
import { getResumeableInterviewSessions } from "@/lib/interview/get-resumeable-sessions";
import { ResumeInterviewBanner } from "@/components/interview/ResumeInterviewBanner";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import { COMPETENCY_CODES } from "@/types";
import { MemberFeedbackInbox } from "@/components/org/MemberFeedbackInbox";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/dashboard");

  const [dashboard, resumeable] = await Promise.all([
    getCompetencyDashboardData(user.id),
    getResumeableInterviewSessions(user.id),
  ]);
  if (!dashboard) redirect("/auth/login");

  const locale = await getLocale();
  const d = getDictionary(locale).dashboard;
  const userSuffix = getDictionary(locale).common.userSuffix;
  const quadScopes = rollupQuadScope(dashboard.latestByCompetency);

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
    .map((row) => row.delta)
    .filter((delta): delta is number => delta != null);
  const growthDelta =
    deltas.length > 0 ? deltas.reduce((s, delta) => s + delta, 0) / deltas.length : null;
  const dashboardNarrative = buildDashboardNarrative({
    sessionCount: dashboard.sessionCount,
    assessedCount,
    weakestCode: weakestEntry?.code ?? null,
    growthDelta,
    latestDimensions: dashboard.coachInsights.latestDimensions,
    recentRound: dashboard.coachInsights.recentRounds[0] ?? null,
  });

  return (
    <div className="product-stage product-stage--wide space-y-8">
      <div className="product-stage__inner !max-w-5xl space-y-8">
      <Suspense fallback={null}>
        <WelcomeBanner />
      </Suspense>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="product-stage__kicker">
            {QUADSCOPE_PRODUCT.name} · Judgment · Delivery · Relations · Anchor
          </p>
          <h1 className="product-stage__title !text-2xl sm:!text-3xl">{d.pageTitle}</h1>
          <p className="product-stage__lead !mt-1">
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
            + Hire
          </Link>
        </div>
      </div>

      {resumeable.length > 0 ? (
        <ResumeInterviewBanner
          variant="dashboard"
          sessions={resumeable.map((s) => ({
            id: s.id,
            focusCompetency: s.focusCompetency,
            sessionNumber: s.sessionNumber,
            startedAt: s.startedAt?.toISOString() ?? null,
            timeBudgetMinutes: s.timeBudgetMinutes,
          }))}
        />
      ) : null}

      <QuadScopePanel scopes={quadScopes} />

      <NarrativeLead text={dashboardNarrative} />

      <MemberFeedbackInbox />

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
        learningPath={dashboard.learningPath}
        showOnboardingBanner={!dashboard.hasDashboardContent}
      />

      <h2 className="text-lg font-semibold text-foreground">{d.coachInsights.sectionTitle}</h2>
      <CoachInsightsPanel {...dashboard.coachInsights} />
      </div>
    </div>
  );
}

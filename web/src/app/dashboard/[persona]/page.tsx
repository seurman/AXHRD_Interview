import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { JobseekerDashboard } from "@/components/dashboard/persona/JobseekerDashboard";
import { WorkerDashboard } from "@/components/dashboard/persona/WorkerDashboard";
import { MockInterviewerDashboard } from "@/components/dashboard/persona/MockInterviewerDashboard";
import {
  emptyCompetencyDashboard,
  getCompetencyDashboardData,
  type CompetencyDashboardPayload,
} from "@/lib/dashboard/get-competency-dashboard-data";
import { buildDashboardNarrative } from "@/lib/dashboard/career-narrative";
import {
  EMPTY_WORKER_DASHBOARD,
  getWorkerDashboardData,
} from "@/lib/dashboard/get-worker-dashboard-data";
import { getResumeableInterviewSessions } from "@/lib/interview/get-resumeable-sessions";
import { listCourseSummaries } from "@/lib/competency-game/progress";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n";
import { COMPETENCY_CODES } from "@/types";
import { isProductPersona, type ProductPersona } from "@/lib/nav/persona";

export const dynamic = "force-dynamic";

export default async function PersonaDashboardPage({
  params,
}: {
  params: Promise<{ persona: string }>;
}) {
  const { persona: raw } = await params;
  if (!isProductPersona(raw)) notFound();
  const persona = raw as ProductPersona;

  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?next=/dashboard/${persona}`);

  const locale = await getLocale();
  const dict = getDictionary(locale).dashboard;

  if (persona === "worker") {
    let data;
    try {
      data = await getWorkerDashboardData(user.id, user.organizationId ?? null);
    } catch (e) {
      console.error("[dashboard/worker]", e);
      data = EMPTY_WORKER_DASHBOARD;
    }
    return <WorkerDashboard userName={user.name} data={data} dict={dict} />;
  }

  let dashboard: CompetencyDashboardPayload | null = null;
  let resumeable: Awaited<ReturnType<typeof getResumeableInterviewSessions>> = [];
  let courses: Awaited<ReturnType<typeof listCourseSummaries>> = [];

  try {
    [dashboard, resumeable, courses] = await Promise.all([
      getCompetencyDashboardData(user.id),
      persona === "jobseeker"
        ? getResumeableInterviewSessions(user.id)
        : Promise.resolve([]),
      persona === "mock" ? listCourseSummaries(user.id) : Promise.resolve([]),
    ]);
  } catch (e) {
    console.error(`[dashboard/${persona}]`, e);
    dashboard = emptyCompetencyDashboard(user.name);
  }

  if (!dashboard) {
    // User row missing (rare race) — fall back to empty shell instead of login loop.
    dashboard = emptyCompetencyDashboard(user.name);
  }

  if (persona === "mock") {
    return (
      <MockInterviewerDashboard
        dashboard={dashboard}
        courses={courses}
        dict={dict}
      />
    );
  }

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
  const narrative = buildDashboardNarrative({
    sessionCount: dashboard.sessionCount,
    assessedCount,
    weakestCode: weakestEntry?.code ?? null,
    growthDelta,
    latestDimensions: dashboard.coachInsights.latestDimensions,
    recentRound: dashboard.coachInsights.recentRounds[0] ?? null,
  });

  return (
    <JobseekerDashboard
      dashboard={dashboard}
      narrative={narrative}
      resumeable={resumeable.map((s) => ({
        id: s.id,
        focusCompetency: s.focusCompetency,
        sessionNumber: s.sessionNumber,
        startedAt: s.startedAt?.toISOString() ?? null,
        timeBudgetMinutes: s.timeBudgetMinutes,
      }))}
      dict={dict}
    />
  );
}

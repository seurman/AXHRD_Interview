import Link from "next/link";
import { Suspense } from "react";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { CoachInsightsPanel } from "@/components/dashboard/CoachInsightsPanel";
import { NarrativeLead } from "@/components/dashboard/NarrativeLead";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { ResumeInterviewBanner } from "@/components/interview/ResumeInterviewBanner";
import { DashboardSectionBoundary } from "@/components/dashboard/DashboardSectionBoundary";
import {
  PersonaActionLink,
  PersonaDashboardHeader,
} from "@/components/dashboard/persona/PersonaDashboardHeader";
import type { CompetencyDashboardPayload } from "@/lib/dashboard/get-competency-dashboard-data";
import type { Dictionary } from "@/lib/i18n/types";

type Resumeable = {
  id: string;
  focusCompetency: string | null;
  sessionNumber: number;
  startedAt: string | null;
  timeBudgetMinutes: number | null;
};

export function JobseekerDashboard({
  dashboard,
  narrative,
  resumeable,
  dict,
}: {
  dashboard: CompetencyDashboardPayload;
  narrative: string;
  resumeable: Resumeable[];
  dict: Dictionary["dashboard"];
}) {
  const p = dict.personas.jobseeker;
  const quests = Array.isArray(dashboard.quests)
    ? dashboard.quests.filter((q) => q.id === "discover" || q.id === "interview")
    : [];

  return (
    <div className="product-stage product-stage--wide space-y-8">
      <div className="product-stage__inner !max-w-5xl space-y-8">
        <Suspense fallback={null}>
          <WelcomeBanner dismissHref="/dashboard/jobseeker" />
        </Suspense>

        <PersonaDashboardHeader
          persona="jobseeker"
          userName={dashboard.userName}
          level={dashboard.level}
          actions={
            <div className="flex flex-wrap gap-2">
              {dashboard.sessionCount > 0 && (
                <PersonaActionLink href="/profile/certificate">{p.ctaCertificate}</PersonaActionLink>
              )}
              <PersonaActionLink href="/interview/setup" primary>
                {p.ctaInterview}
              </PersonaActionLink>
            </div>
          }
        />

        {resumeable.length > 0 ? (
          <ResumeInterviewBanner variant="dashboard" sessions={resumeable} />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/interview/setup", label: p.quickInterview, hint: p.quickInterviewHint },
            { href: "/resume-review", label: p.quickResume, hint: p.quickResumeHint },
            { href: "/discover", label: p.quickDiscover, hint: p.quickDiscoverHint },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-border/70 bg-card/40 px-4 py-3 transition hover:border-gold/40 hover:bg-card"
            >
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            </Link>
          ))}
        </div>

        <NarrativeLead text={narrative} />

        <h2 className="text-lg font-semibold text-foreground">{dict.competencySection}</h2>
        <DashboardSectionBoundary
          label="competency"
          fallback={
            <p className="rounded-xl border border-border/60 bg-card/40 px-4 py-6 text-sm text-muted">
              역량 패널을 불러오지 못했습니다. 면접을 한 번 더 진행한 뒤 새로고침해 주세요.
            </p>
          }
        >
          <CompetencyDashboard
            snapshots={dashboard.snapshots}
            latestByCompetency={dashboard.latestByCompetency}
            sessionCount={dashboard.sessionCount}
            dimensionTimeline={dashboard.dimensionTimeline}
            quests={quests}
            totalXp={dashboard.totalXp}
            level={dashboard.level}
            strengthDeck={dashboard.strengthDeck}
            learningPath={dashboard.learningPath}
            showOnboardingBanner={!dashboard.hasDashboardContent}
          />
        </DashboardSectionBoundary>

        <h2 className="text-lg font-semibold text-foreground">{dict.coachInsights.sectionTitle}</h2>
        <DashboardSectionBoundary
          label="coach"
          fallback={
            <p className="rounded-xl border border-border/60 bg-card/40 px-4 py-6 text-sm text-muted">
              코칭 인사이트를 잠시 표시할 수 없습니다.
            </p>
          }
        >
          <CoachInsightsPanel {...dashboard.coachInsights} />
        </DashboardSectionBoundary>
      </div>
    </div>
  );
}

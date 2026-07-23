import Link from "next/link";
import { Suspense } from "react";
import { CompetencyDashboard } from "@/components/dashboard/CompetencyDashboard";
import { CoachInsightsPanel } from "@/components/dashboard/CoachInsightsPanel";
import { NarrativeLead } from "@/components/dashboard/NarrativeLead";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { ResumeInterviewBanner } from "@/components/interview/ResumeInterviewBanner";
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
        <CompetencyDashboard
          snapshots={dashboard.snapshots}
          latestByCompetency={dashboard.latestByCompetency}
          sessionCount={dashboard.sessionCount}
          dimensionTimeline={dashboard.dimensionTimeline}
          quests={dashboard.quests.filter((q) => q.id === "discover" || q.id === "interview")}
          totalXp={dashboard.totalXp}
          level={dashboard.level}
          strengthDeck={dashboard.strengthDeck}
          learningPath={null}
          showOnboardingBanner={!dashboard.hasDashboardContent}
        />

        <h2 className="text-lg font-semibold text-foreground">{dict.coachInsights.sectionTitle}</h2>
        <CoachInsightsPanel {...dashboard.coachInsights} />
      </div>
    </div>
  );
}

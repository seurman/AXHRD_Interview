import Link from "next/link";
import { Suspense } from "react";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { LearningPathCard } from "@/components/dashboard/LearningPathCard";
import { QuestPanel } from "@/components/dashboard/QuestPanel";
import {
  PersonaActionLink,
  PersonaDashboardHeader,
} from "@/components/dashboard/persona/PersonaDashboardHeader";
import type { CompetencyDashboardPayload } from "@/lib/dashboard/get-competency-dashboard-data";
import type { Dictionary } from "@/lib/i18n/types";

type GameCourseSummary = {
  competency: string;
  titleKo: string;
  progressPct: number;
  clearedCount: number;
  totalLevels: number;
  hasContent: boolean;
  continueHref: string;
  nextLevelTitle: string | null;
  xp: number;
  completed: boolean;
};

export function MockInterviewerDashboard({
  dashboard,
  courses,
  dict,
}: {
  dashboard: CompetencyDashboardPayload;
  courses: GameCourseSummary[];
  dict: Dictionary["dashboard"];
}) {
  const p = dict.personas.mock;
  const activeCourses = courses.filter((c) => c.hasContent);
  const continueCourse =
    activeCourses.find((c) => !c.completed && c.nextLevelTitle) ?? activeCourses[0] ?? null;
  const gameQuests = dashboard.quests.filter((q) =>
    q.id === "game" || q.id === "path" || q.id === "swipe" || q.id === "interview",
  );

  return (
    <div className="product-stage product-stage--wide space-y-8">
      <div className="product-stage__inner !max-w-5xl space-y-8">
        <Suspense fallback={null}>
          <WelcomeBanner dismissHref="/dashboard/mock" />
        </Suspense>

        <PersonaDashboardHeader
          persona="mock"
          userName={dashboard.userName}
          level={dashboard.level}
          actions={
            <div className="flex flex-wrap gap-2">
              <PersonaActionLink href="/practice/game" primary>
                {p.ctaGame}
              </PersonaActionLink>
              <PersonaActionLink href="/demo">{p.ctaTrial}</PersonaActionLink>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/practice/game", label: p.quickGame, hint: p.quickGameHint },
            { href: "/practice/path", label: p.quickPath, hint: p.quickPathHint },
            { href: "/practice/swipe", label: p.quickSwipe, hint: p.quickSwipeHint },
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

        {continueCourse ? (
          <div className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">{p.continueEyebrow}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{continueCourse.titleKo}</p>
            <p className="mt-1 text-sm text-muted">
              {continueCourse.nextLevelTitle
                ? p.continueLevel.replace("{level}", continueCourse.nextLevelTitle)
                : p.continueCourse}
              {" · "}
              {continueCourse.clearedCount}/{continueCourse.totalLevels}
              {" · "}
              {continueCourse.progressPct}%
            </p>
            <Link href={continueCourse.continueHref} className="btn-primary mt-3 inline-flex text-sm">
              {p.continueCta}
            </Link>
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{p.coursesTitle}</h2>
          {activeCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">{p.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted">{p.emptyBody}</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {activeCourses.map((course) => (
                <li key={course.competency}>
                  <Link
                    href={course.continueHref}
                    className="block rounded-xl border border-border/70 bg-card/40 px-4 py-3 transition hover:border-gold/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{course.titleKo}</p>
                      <span className="text-xs text-muted">{course.xp} XP</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/60">
                      <div
                        className="h-full rounded-full bg-gold"
                        style={{ width: `${course.progressPct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {course.clearedCount}/{course.totalLevels}
                      {course.completed ? ` · ${p.completed}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {dashboard.learningPath ? (
          <LearningPathCard
            weakness={dashboard.learningPath.weakness}
            pathSummary={dashboard.learningPath.competencies}
          />
        ) : null}

        <QuestPanel quests={gameQuests} totalXp={dashboard.totalXp} level={dashboard.level} />
      </div>
    </div>
  );
}

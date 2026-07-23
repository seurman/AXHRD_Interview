import Link from "next/link";
import { Suspense } from "react";
import { WelcomeBanner } from "@/components/auth/WelcomeBanner";
import { MemberFeedbackInbox } from "@/components/org/MemberFeedbackInbox";
import { InteractivePercentileBars } from "@/components/charts/InteractivePercentileBars";
import { WorkerScoreTrendChart } from "@/components/dashboard/persona/WorkerScoreTrendChart";
import {
  PersonaActionLink,
  PersonaDashboardHeader,
} from "@/components/dashboard/persona/PersonaDashboardHeader";
import type { WorkerDashboardData } from "@/lib/dashboard/get-worker-dashboard-data";
import type { Dictionary } from "@/lib/i18n/types";

function statusLabel(status: string, labels: Dictionary["dashboard"]["personas"]["worker"]["status"]) {
  if (status === "SCORED") return labels.scored;
  if (status === "SUBMITTED") return labels.submitted;
  if (status === "IN_PROGRESS") return labels.inProgress;
  return labels.draft;
}

function kindLabel(kind: string): string {
  if (kind === "ROLE_PLAY") return "역할연기";
  if (kind === "IN_BASKET") return "서류함";
  return kind;
}

export function WorkerDashboard({
  userName,
  data,
  dict,
}: {
  userName: string;
  data: WorkerDashboardData;
  dict: Dictionary["dashboard"];
}) {
  const p = dict.personas.worker;

  return (
    <div className="product-stage product-stage--wide space-y-8">
      <div className="product-stage__inner !max-w-5xl space-y-8">
        <Suspense fallback={null}>
          <WelcomeBanner dismissHref="/dashboard/worker" />
        </Suspense>

        <PersonaDashboardHeader
          persona="worker"
          userName={userName}
          actions={
            <PersonaActionLink href="/assessment" primary>
              {p.ctaAssessment}
            </PersonaActionLink>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-3">
            <p className="text-xs text-muted">{p.statPublished}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{data.publishedScenarioCount}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-3">
            <p className="text-xs text-muted">{p.statCompleted}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{data.completedCount}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/40 px-4 py-3">
            <p className="text-xs text-muted">{p.statLatestScore}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {typeof data.latestScore === "number" && Number.isFinite(data.latestScore)
                ? data.latestScore.toFixed(1)
                : "—"}
            </p>
          </div>
        </div>

        {(data.scoreTrend.length > 0 || data.competencyAverages.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-luxe p-5">
              <h3 className="font-semibold text-foreground">점수 추이</h3>
              <p className="mt-1 text-xs text-muted">완료한 평가 점수를 시간순으로 봅니다.</p>
              <div className="mt-4">
                <WorkerScoreTrendChart points={data.scoreTrend} />
              </div>
            </div>
            <div className="card-luxe p-5">
              <h3 className="font-semibold text-foreground">역량별 평균</h3>
              <p className="mt-1 text-xs text-muted">여러 시도의 평가를 역량별로 모아 평균 냈습니다.</p>
              <div className="mt-4">
                <InteractivePercentileBars
                  items={data.competencyAverages.map((c) => ({
                    id: c.code,
                    label: c.nameKo,
                    value: Math.round((c.avgScore / 5) * 100),
                    deltaLabel: `${c.avgScore.toFixed(1)}/5 · ${c.attemptCount}회`,
                  }))}
                  emptyHint="완료한 평가가 쌓이면 역량별 평균이 여기 표시됩니다."
                />
              </div>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">{p.attemptsTitle}</h2>
            <Link href="/assessment" className="text-sm text-accent hover:underline">
              {p.viewCatalog}
            </Link>
          </div>
          {data.attempts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">{p.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted">{p.emptyBody}</p>
              <Link href="/assessment" className="btn-primary mt-4 inline-flex text-sm">
                {p.ctaAssessment}
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
              {data.attempts.map((attempt) => (
                <li key={attempt.id}>
                  <Link
                    href={
                      attempt.status === "SCORED" || attempt.status === "SUBMITTED"
                        ? `/assessment/attempt/${attempt.id}/report`
                        : `/assessment/attempt/${attempt.id}`
                    }
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition hover:bg-card/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {attempt.scenarioTitle}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {kindLabel(attempt.scenarioKind)} · {statusLabel(attempt.status, p.status)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {typeof attempt.overallScore === "number" &&
                      Number.isFinite(attempt.overallScore)
                        ? attempt.overallScore.toFixed(1)
                        : p.continue}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {data.inProgressCount > 0 && typeof p.inProgressHint === "string" ? (
          <p className="text-sm text-muted">
            {p.inProgressHint.replace("{count}", String(data.inProgressCount))}
          </p>
        ) : null}

        <MemberFeedbackInbox />
      </div>
    </div>
  );
}

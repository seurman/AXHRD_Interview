"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { CohortData } from "@/lib/org/cohort";
import type { OrgActivityRow } from "@/lib/org/activity-log";
import type { OrgPeopleDashboardData } from "@/lib/org/people-dashboard";
import type { OrgEntitlementSnapshot, OrgProductKey } from "@/lib/org/entitlements";
import { ORG_PRODUCTS } from "@/lib/org/entitlements";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { CopyCodeButton } from "@/components/org/CopyCodeButton";
import { RegenerateCodeButton } from "@/components/org/RegenerateCodeButton";
import { OrgActivityLogPanel } from "@/components/org/OrgActivityLogPanel";
import { OrgPeopleDashboardClient } from "@/components/org/OrgPeopleDashboardClient";
import { OrgMembersPanel } from "@/components/org/OrgMembersPanel";

export type OrgOpsTab = "overview" | "people" | "members";

const PRODUCT_HREFS: Record<OrgProductKey, string> = {
  interview: "/org/dashboard?tab=overview",
  competency: "/org/candidates",
  diagnostic: "/org/diagnosis",
  assessment: "/org/settings/assessment",
};

const TABS: Array<{ id: OrgOpsTab; label: string }> = [
  { id: "overview", label: "개요" },
  { id: "people", label: "구성원" },
  { id: "members", label: "승인·좌석" },
];

function parseTab(raw: string | null): OrgOpsTab {
  if (raw === "people" || raw === "members" || raw === "overview") return raw;
  if (raw === "participation" || raw === "cohort") return "overview";
  return "overview";
}

export function OrgOpsConsole({
  organizationName,
  orgRole,
  entitlements,
  cohort,
  people,
  activityPreview,
}: {
  organizationName: string;
  orgRole: string;
  entitlements: OrgEntitlementSnapshot;
  cohort: CohortData;
  people: OrgPeopleDashboardData;
  activityPreview: OrgActivityRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const isAdmin = orgRole === "ADMIN";

  const activeProducts = useMemo(
    () => ORG_PRODUCTS.filter((p) => entitlements[p.key] && p.key !== "interview"),
    [entitlements],
  );

  const setTab = useCallback(
    (next: OrgOpsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `/org/dashboard?${q}` : "/org/dashboard", { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="border-b border-card-border pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Organization console
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {organizationName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              참여·구성원·가입 승인을 한 화면에서 관리합니다.
            </p>
          </div>
          {isAdmin ? (
            <Link
              href="/org/settings"
              className="min-h-10 rounded-lg border border-card-border px-3 text-sm font-medium text-muted hover:text-foreground"
            >
              설정
            </Link>
          ) : null}
        </div>

        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-transparent">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`min-h-10 shrink-0 border-b-2 px-3 text-sm font-medium transition ${
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {tab === "overview" ? (
        <OverviewPane
          cohort={cohort}
          people={people}
          activityPreview={activityPreview}
          isAdmin={isAdmin}
          activeProducts={activeProducts}
        />
      ) : null}

      {tab === "people" ? (
        <OrgPeopleDashboardClient data={people} embedded />
      ) : null}

      {tab === "members" ? (
        <div className="rounded-2xl border border-card-border bg-card p-4 sm:p-6">
          <OrgMembersPanel isAdmin={isAdmin} embedded />
        </div>
      ) : null}
    </div>
  );
}

function OverviewPane({
  cohort,
  people,
  activityPreview,
  isAdmin,
  activeProducts,
}: {
  cohort: CohortData;
  people: OrgPeopleDashboardData;
  activityPreview: OrgActivityRow[];
  isAdmin: boolean;
  activeProducts: typeof ORG_PRODUCTS;
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="소속 계정" value={String(people.summary.memberCount)} hint={`접속 중 ${people.summary.onlineCount}`} />
        <Kpi label="완료 면접" value={String(cohort.totalCompletedSessions)} hint="누적" />
        <Kpi
          label="평균 백분위"
          value={
            cohort.overallAvgPercentile != null
              ? String(cohort.overallAvgPercentile)
              : "—"
          }
          hint="구성원 최신 스냅샷"
        />
        <Kpi
          label="주의 신호"
          value={String(cohort.integritySignalSessions)}
          hint="붙여넣기·탭이탈"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">가입 코드</h2>
              <p className="mt-1 text-xs text-muted">
                구성원이 기관 연결 시 입력합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CopyCodeButton code={cohort.joinCode} />
              {isAdmin ? <RegenerateCodeButton /> : null}
            </div>
          </div>
          <p className="mt-4 font-mono text-2xl tracking-[0.2em] text-foreground">
            {cohort.joinCode}
          </p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">이번 주 활동</h2>
          <p className="mt-3 font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tabular-nums">
            {people.summary.activeThisWeek}
            <span className="ml-1 text-sm font-normal text-muted">명</span>
          </p>
          <p className="mt-1 text-xs text-muted">로그인 또는 면접 완료 기준</p>
          <p className="mt-4 text-xs text-muted">
            상세 동의 {people.summary.consentCount}명 · 미열람 피드백{" "}
            {people.summary.unreadFeedbackCount}건
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">역량별 평균</h2>
        <p className="mt-1 text-xs text-muted">낮은 역량부터 — 코칭 우선순위</p>
        {cohort.competencies.length === 0 ? (
          <p className="mt-4 text-sm text-muted">아직 완료된 면접 데이터가 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {cohort.competencies.map((c) => (
              <li key={c.competency}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{competencyLabel(c.competency)}</span>
                  <span className="text-muted">
                    {formatPercentile(c.avgPercentile)} · {c.memberCount}명
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{
                      width: `${Math.max(4, Math.min(100, c.avgPercentile))}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {activeProducts.length > 0 ? (
        <section className="rounded-2xl border border-card-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">다른 운영 화면</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeProducts.map((p) => (
              <Link
                key={p.key}
                href={PRODUCT_HREFS[p.key]}
                className="min-h-10 rounded-lg border border-card-border px-3 text-sm text-muted hover:text-foreground"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-card-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">최근 활동</h2>
          <Link
            href="/org/dashboard/activity"
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            전체 보기
          </Link>
        </div>
        <OrgActivityLogPanel rows={activityPreview} />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-card px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

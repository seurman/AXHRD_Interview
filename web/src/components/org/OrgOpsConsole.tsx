"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const TABS: Array<{ id: OrgOpsTab; label: string; hint: string }> = [
  { id: "overview", label: "개요", hint: "지표·활동" },
  { id: "people", label: "구성원", hint: "면접·역량" },
  { id: "members", label: "승인·좌석", hint: "가입 관리" },
];

function parseTab(raw: string | null | undefined): OrgOpsTab {
  if (raw === "people" || raw === "members" || raw === "overview") return raw;
  if (raw === "participation" || raw === "cohort") return "overview";
  return "overview";
}

/** Next 라우팅 없이 쿼리만 갱신 — 탭 전환 시 RSC 재요청·전환 오버레이를 피한다 */
function syncTabQuery(next: OrgOpsTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (next === "overview") url.searchParams.delete("tab");
  else url.searchParams.set("tab", next);
  window.history.replaceState(window.history.state, "", url.pathname + url.search);
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
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<OrgOpsTab>(() =>
    parseTab(searchParams.get("tab")),
  );
  const isAdmin = orgRole === "ADMIN";

  useEffect(() => {
    setTabState(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const setTab = useCallback((next: OrgOpsTab) => {
    setTabState(next);
    syncTabQuery(next);
  }, []);

  const activeProducts = useMemo(
    () => ORG_PRODUCTS.filter((p) => entitlements[p.key] && p.key !== "interview"),
    [entitlements],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-[1.5rem] border border-card-border bg-card shadow-luxe">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 100% -10%, color-mix(in srgb, var(--color-gold) 18%, transparent), transparent 55%), linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 42%)",
          }}
        />
        <div className="relative px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
                Organization console
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {organizationName}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted">
                참여 지표, 구성원 코칭, 가입 승인을 한곳에서 운영합니다.
              </p>
            </div>
            {isAdmin ? (
              <Link
                href="/org/settings"
                className="relative z-10 inline-flex min-h-10 items-center rounded-xl border border-card-border bg-background/80 px-3.5 text-sm font-medium text-foreground backdrop-blur hover:bg-background"
              >
                설정
              </Link>
            ) : null}
          </div>

          <div
            role="tablist"
            aria-label="기관 대시보드 탭"
            className="relative z-10 mt-6 grid grid-cols-3 gap-1 rounded-xl bg-background/80 p-1 ring-1 ring-card-border"
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`relative z-10 min-h-12 touch-manipulation rounded-lg px-2 py-2 text-center transition ${
                    active
                      ? "bg-card text-foreground shadow-sm ring-1 ring-card-border"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className="mt-0.5 hidden text-[10px] sm:block">{t.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div role="tabpanel">
        {tab === "overview" ? (
          <OverviewPane
            cohort={cohort}
            people={people}
            activityPreview={activityPreview}
            isAdmin={isAdmin}
            activeProducts={activeProducts}
            onOpenPeople={() => setTab("people")}
            onOpenMembers={() => setTab("members")}
          />
        ) : null}

        {tab === "people" ? (
          <OrgPeopleDashboardClient data={people} embedded />
        ) : null}

        {tab === "members" ? (
          <div className="rounded-[1.5rem] border border-card-border bg-card p-4 shadow-luxe sm:p-6">
            <OrgMembersPanel isAdmin={isAdmin} embedded />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OverviewPane({
  cohort,
  people,
  activityPreview,
  isAdmin,
  activeProducts,
  onOpenPeople,
  onOpenMembers,
}: {
  cohort: CohortData;
  people: OrgPeopleDashboardData;
  activityPreview: OrgActivityRow[];
  isAdmin: boolean;
  activeProducts: typeof ORG_PRODUCTS;
  onOpenPeople: () => void;
  onOpenMembers: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="소속 계정"
          value={String(people.summary.memberCount)}
          hint={`접속 중 ${people.summary.onlineCount}`}
        />
        <Kpi
          label="완료 면접"
          value={String(cohort.totalCompletedSessions)}
          hint="누적 세션"
        />
        <Kpi
          label="평균 백분위"
          value={
            cohort.overallAvgPercentile != null
              ? String(cohort.overallAvgPercentile)
              : "—"
          }
          hint="최신 스냅샷"
        />
        <Kpi
          label="주의 신호"
          value={String(cohort.integritySignalSessions)}
          hint="붙여넣기·탭이탈"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenPeople}
          className="rounded-[1.25rem] border border-card-border bg-card p-5 text-left shadow-luxe transition hover:border-foreground/20"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
            People
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">구성원 현황 보기</p>
          <p className="mt-1 text-xs text-muted">
            면접·역량 시계열·코칭 피드백 · 이번 주 활동 {people.summary.activeThisWeek}명
          </p>
        </button>
        <button
          type="button"
          onClick={onOpenMembers}
          className="rounded-[1.25rem] border border-card-border bg-card p-5 text-left shadow-luxe transition hover:border-foreground/20"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gold">
            Access
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">승인·좌석 관리</p>
          <p className="mt-1 text-xs text-muted">
            가입 승인, 좌석, 소속 해제
          </p>
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.25rem] border border-card-border bg-card p-5 shadow-luxe">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">가입 코드</h2>
              <p className="mt-1 text-xs text-muted">구성원이 기관 연결 시 입력합니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <CopyCodeButton code={cohort.joinCode} />
              {isAdmin ? <RegenerateCodeButton /> : null}
            </div>
          </div>
          <p className="mt-5 font-mono text-3xl tracking-[0.22em] text-foreground">
            {cohort.joinCode}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-card-border bg-card p-5 shadow-luxe">
          <h2 className="text-sm font-semibold text-foreground">이번 주 활동</h2>
          <p className="mt-3 font-[family-name:var(--font-ibm-plex)] text-4xl font-semibold tabular-nums text-foreground">
            {people.summary.activeThisWeek}
            <span className="ml-1.5 text-sm font-normal text-muted">명</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            상세 동의 {people.summary.consentCount}명
            <br />
            미열람 피드백 {people.summary.unreadFeedbackCount}건
          </p>
        </div>
      </section>

      <section className="rounded-[1.25rem] border border-card-border bg-card p-5 shadow-luxe">
        <h2 className="text-sm font-semibold text-foreground">역량별 평균</h2>
        <p className="mt-1 text-xs text-muted">낮은 역량부터 — 코칭 우선순위</p>
        {cohort.competencies.length === 0 ? (
          <p className="mt-4 text-sm text-muted">아직 완료된 면접 데이터가 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-3.5">
            {cohort.competencies.map((c) => (
              <li key={c.competency}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {competencyLabel(c.competency)}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatPercentile(c.avgPercentile)} · {c.memberCount}명
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
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
        <section className="rounded-[1.25rem] border border-card-border bg-card p-5 shadow-luxe">
          <h2 className="text-sm font-semibold text-foreground">다른 운영 화면</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeProducts.map((p) => (
              <Link
                key={p.key}
                href={PRODUCT_HREFS[p.key]}
                className="inline-flex min-h-10 items-center rounded-xl border border-card-border px-3.5 text-sm text-muted transition hover:border-foreground/25 hover:text-foreground"
              >
                {p.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.25rem] border border-card-border bg-card p-5 shadow-luxe">
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
    <div className="rounded-[1.25rem] border border-card-border bg-card px-4 py-4 shadow-luxe">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums text-foreground sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

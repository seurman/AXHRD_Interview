"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
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

/**
 * 기관 운영 콘솔 UI — Stripe / Linear / Vercel 대시보드 벤치마크
 * - 좌측 레일 내비 (데스크톱) + 상단 세그먼트 (모바일)
 * - KPI 스트립: 큰 수치 + 보조 힌트, 1px 보더 플랫 서피스
 * - 액센트는 gold 한 점만, 그림자는 최소
 */

export type OrgOpsTab = "overview" | "people" | "members";

const PRODUCT_HREFS: Record<OrgProductKey, string> = {
  interview: "/org/dashboard?tab=overview",
  competency: "/org/candidates",
  diagnostic: "/org/diagnosis",
  assessment: "/org/settings/assessment",
};

const NAV: Array<{
  id: OrgOpsTab;
  label: string;
  description: string;
  mobileLabel: string;
  icon: typeof LayoutDashboard;
}> = [
  {
    id: "overview",
    label: "개요",
    description: "지표 · 활동",
    mobileLabel: "개요",
    icon: LayoutDashboard,
  },
  {
    id: "people",
    label: "구성원",
    description: "명단 · 코칭",
    mobileLabel: "구성원",
    icon: Users,
  },
  {
    id: "members",
    label: "승인·좌석",
    description: "가입 · 한도",
    mobileLabel: "승인",
    icon: ShieldCheck,
  },
];

function parseTab(raw: string | null | undefined): OrgOpsTab {
  if (raw === "people" || raw === "members" || raw === "overview") return raw;
  if (raw === "participation" || raw === "cohort") return "overview";
  return "overview";
}

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
  pendingCount = 0,
}: {
  organizationName: string;
  orgRole: string;
  entitlements: OrgEntitlementSnapshot;
  cohort: CohortData;
  people: OrgPeopleDashboardData;
  activityPreview: OrgActivityRow[];
  pendingCount?: number;
}) {
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<OrgOpsTab>(() =>
    parseTab(searchParams.get("tab")),
  );
  const [entered, setEntered] = useState(false);
  const isAdmin = orgRole === "ADMIN";

  useEffect(() => {
    setTabState(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const setTab = useCallback((next: OrgOpsTab) => {
    setTabState(next);
    syncTabQuery(next);
  }, []);

  const activeProducts = useMemo(
    () => ORG_PRODUCTS.filter((p) => entitlements[p.key] && p.key !== "interview"),
    [entitlements],
  );

  const title =
    tab === "overview" ? "개요" : tab === "people" ? "구성원" : "승인·좌석";
  const subtitle =
    tab === "overview"
      ? "핵심 지표와 최근 활동을 한눈에 봅니다."
      : tab === "people"
        ? "면접·역량·접속을 보고 코칭합니다."
        : "가입 승인과 좌석 한도를 관리합니다.";

  return (
    <div
      className={`mx-auto max-w-7xl pb-10 transition duration-500 ease-out ${
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-6 xl:gap-8">
        {/* ── Sidebar (desktop) — Linear / Vercel rail ── */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
                Workspace
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-ibm-plex)] text-lg font-semibold leading-snug tracking-tight text-foreground">
                {organizationName}
              </h1>
            </div>

            <nav aria-label="기관 콘솔" className="space-y-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                      active
                        ? "bg-foreground text-background"
                        : "text-muted hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        active ? "opacity-90" : "opacity-70 group-hover:opacity-100"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block text-sm font-semibold tracking-tight">
                          {item.label}
                        </span>
                        {item.id === "members" && pendingCount > 0 ? (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                              active
                                ? "bg-background/20 text-background"
                                : "bg-warning/15 text-warning"
                            }`}
                          >
                            {pendingCount}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`block text-[11px] ${
                          active ? "text-background/70" : "text-muted"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {isAdmin ? (
              <Link
                href="/org/settings"
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted transition hover:bg-card hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
                설정
              </Link>
            ) : null}
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="min-w-0 space-y-5">
          <div className="lg:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              Organization
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tracking-tight">
              {organizationName}
            </h1>
            <div
              role="tablist"
              className="mt-4 grid grid-cols-3 gap-1 rounded-xl border border-card-border bg-card p-1"
            >
              {NAV.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.id)}
                    className={`relative min-h-11 touch-manipulation rounded-lg text-sm font-semibold transition ${
                      active
                        ? "bg-foreground text-background"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {item.mobileLabel}
                    {item.id === "members" && pendingCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-white">
                        {pendingCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden items-end justify-between gap-4 border-b border-card-border pb-4 lg:flex">
            <div>
              <h2 className="font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="mt-1 text-sm text-muted">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-card-border bg-card px-2.5 py-1 font-mono text-xs tracking-wider text-foreground">
                {cohort.joinCode}
              </span>
              <CopyCodeButton code={cohort.joinCode} />
              {isAdmin ? <RegenerateCodeButton /> : null}
            </div>
          </div>

          <div key={tab} className="org-ops-pane-in">
            {tab === "overview" ? (
              <OverviewPane
                cohort={cohort}
                people={people}
                activityPreview={activityPreview}
                isAdmin={isAdmin}
                activeProducts={activeProducts}
                pendingCount={pendingCount}
                onOpenPeople={() => setTab("people")}
                onOpenMembers={() => setTab("members")}
              />
            ) : null}
            {tab === "people" ? (
              <OrgPeopleDashboardClient data={people} embedded />
            ) : null}
            {tab === "members" ? (
              <OrgMembersPanel isAdmin={isAdmin} embedded />
            ) : null}
          </div>
        </div>
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
  pendingCount,
  onOpenPeople,
  onOpenMembers,
}: {
  cohort: CohortData;
  people: OrgPeopleDashboardData;
  activityPreview: OrgActivityRow[];
  isAdmin: boolean;
  activeProducts: typeof ORG_PRODUCTS;
  pendingCount: number;
  onOpenPeople: () => void;
  onOpenMembers: () => void;
}) {
  const consentRate =
    people.summary.memberCount > 0
      ? Math.round(
          (people.summary.consentCount / people.summary.memberCount) * 100,
        )
      : null;

  return (
    <div className="space-y-5">
      {/* KPI strip — Stripe Dashboard 패턴: gap-px 그리드 */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-card-border bg-card-border lg:grid-cols-4">
        <MetricCell
          label="계정"
          value={String(people.summary.memberCount)}
          meta={`온라인 ${people.summary.onlineCount}`}
        />
        <MetricCell
          label="면접"
          value={String(cohort.totalCompletedSessions)}
          meta="완료 세션"
        />
        <MetricCell
          label="백분위"
          value={
            cohort.overallAvgPercentile != null
              ? String(cohort.overallAvgPercentile)
              : "—"
          }
          meta="기관 평균"
        />
        <MetricCell
          label="무결성"
          value={String(cohort.integritySignalSessions)}
          meta="주의 신호"
          tone={cohort.integritySignalSessions > 0 ? "warn" : "ok"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          icon={Users}
          kicker="People"
          title="구성원 코칭"
          body={`이번 주 활동 ${people.summary.activeThisWeek}명 · 동의 ${consentRate ?? 0}%`}
          onClick={onOpenPeople}
        />
        <QuickLink
          icon={ShieldCheck}
          kicker="Access"
          title="승인 · 좌석"
          body={
            pendingCount > 0
              ? `승인 대기 ${pendingCount}건 · 바로 검토하세요`
              : "가입 요청 검토와 좌석 한도 관리"
          }
          onClick={onOpenMembers}
          badge={pendingCount > 0 ? pendingCount : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-card-border bg-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              역량 분포
            </h3>
            <span className="text-[11px] text-muted">취약 → 강점</span>
          </div>
          {cohort.competencies.length === 0 ? (
            <p className="mt-6 text-sm text-muted">아직 면접 데이터가 없습니다.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {cohort.competencies.map((c) => (
                <li key={c.competency}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">
                      {competencyLabel(c.competency)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {formatPercentile(c.avgPercentile)}
                      <span className="ml-2 text-[11px]">{c.memberCount}명</span>
                    </span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-foreground transition-[width] duration-500"
                      style={{
                        width: `${Math.max(3, Math.min(100, c.avgPercentile))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-card-border bg-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              가입 코드
            </p>
            <p className="mt-3 font-mono text-2xl tracking-[0.18em] text-foreground">
              {cohort.joinCode}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              <CopyCodeButton code={cohort.joinCode} />
              {isAdmin ? <RegenerateCodeButton /> : null}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              구성원이 기관 연결 시 입력합니다.
            </p>
          </div>

          <div className="rounded-xl border border-card-border bg-card p-5">
            <div className="flex items-center gap-2 text-muted">
              <Activity className="h-3.5 w-3.5" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                이번 주
              </p>
            </div>
            <p className="mt-3 font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tabular-nums">
              {people.summary.activeThisWeek}
            </p>
            <p className="mt-1 text-xs text-muted">
              미열람 피드백 {people.summary.unreadFeedbackCount}건
            </p>
          </div>
        </div>
      </section>

      {activeProducts.length > 0 ? (
        <section className="flex flex-wrap gap-2">
          {activeProducts.map((p) => (
            <Link
              key={p.key}
              href={PRODUCT_HREFS[p.key]}
              className="group inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-card-border bg-card px-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              {p.label}
              <ArrowUpRight className="h-3.5 w-3.5 opacity-50 transition group-hover:opacity-100" />
            </Link>
          ))}
        </section>
      ) : null}

      <section className="rounded-xl border border-card-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold tracking-tight">최근 활동</h3>
          <Link
            href="/org/dashboard/activity"
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            전체 보기
          </Link>
        </div>
        <OrgActivityLogPanel rows={activityPreview} bare />
      </section>
    </div>
  );
}

function MetricCell({
  label,
  value,
  meta,
  tone,
}: {
  label: string;
  value: string;
  meta: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="bg-card px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-ibm-plex)] text-[1.75rem] font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-[2rem]">
        {value}
      </p>
      <p
        className={`mt-2 text-xs ${
          tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-muted"
        }`}
      >
        {meta}
      </p>
    </div>
  );
}

function QuickLink({
  icon: Icon,
  kicker,
  title,
  body,
  onClick,
  badge,
}: {
  icon: typeof Users;
  kicker: string;
  title: string;
  body: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-xl border border-card-border bg-card p-4 text-left transition hover:border-foreground/25 hover:bg-background/40"
    >
      <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-card-border bg-background text-foreground transition group-hover:border-foreground/30">
        <Icon className="h-4 w-4" />
        {badge != null && badge > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
          {kicker}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-foreground">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-70" />
        </span>
        <span className="mt-0.5 block text-xs text-muted">{body}</span>
      </span>
    </button>
  );
}

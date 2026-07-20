"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OrgPeopleDashboardData, PeopleMemberRow } from "@/lib/org/people-dashboard";
import { competencyLabel, formatPercentile } from "@/lib/labels";
import { ORG_ROLE_LABEL } from "@/lib/auth/roles";
import { PeopleSearchField, Sparkline } from "@/components/org/CompetencyTrendChart";

function formatRelative(iso: string | null): string {
  if (!iso) return "기록 없음";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        online
          ? "bg-success ring-2 ring-success/25 ring-offset-1 ring-offset-card"
          : "bg-muted/40"
      }`}
      title={online ? "최근 접속" : "오프라인"}
    />
  );
}

type SortKey = "name" | "interviews" | "score" | "login" | "delta";
type PeopleFilter = "all" | "inactive" | "no_consent" | "declining" | "online" | "consent";

const FILTER_EMPTY: Record<PeopleFilter, string> = {
  all: "아직 소속 계정이 없습니다. 「승인·좌석」 탭에서 가입을 승인해 주세요.",
  inactive: "면접을 아직 완료하지 않은 구성원이 없습니다.",
  no_consent: "상세 미동의 구성원이 없습니다.",
  declining: "향상도가 하락한 구성원이 없습니다.",
  online: "최근 접속 중인 구성원이 없습니다.",
  consent: "상세 동의한 구성원이 없습니다.",
};

export function OrgPeopleDashboardClient({
  data,
  embedded = false,
}: {
  data: OrgPeopleDashboardData;
  embedded?: boolean;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [filter, setFilter] = useState<PeopleFilter>("all");
  const [exporting, setExporting] = useState(false);

  const members = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = data.members.filter((m) => {
      switch (filter) {
        case "inactive":
          if (m.completedInterviews !== 0) return false;
          break;
        case "no_consent":
          if (m.coachingConsent) return false;
          break;
        case "declining":
          if (m.deltaPercentile == null || m.deltaPercentile >= 0) return false;
          break;
        case "online":
          if (!m.online) return false;
          break;
        case "consent":
          if (!m.coachingConsent) return false;
          break;
        default:
          break;
      }
      if (!needle) return true;
      return (
        m.name.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "interviews":
          return b.completedInterviews - a.completedInterviews;
        case "score":
          return (b.avgPercentile ?? -1) - (a.avgPercentile ?? -1);
        case "login":
          return (b.lastLoginAt ?? "").localeCompare(a.lastLoginAt ?? "");
        case "delta":
          return (b.deltaPercentile ?? -999) - (a.deltaPercentile ?? -999);
        default:
          return a.name.localeCompare(b.name, "ko");
      }
    });
    return list;
  }, [data.members, filter, q, sort]);

  const s = data.summary;
  const hasRoster = data.members.length > 0;
  const emptyHint = !hasRoster
    ? FILTER_EMPTY.all
    : q.trim()
      ? "검색 결과가 없습니다. 이름·이메일을 바꿔 보세요."
      : FILTER_EMPTY[filter];

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch("/api/org/people/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "내보내기 실패");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `org-people-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "내보내기 실패");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className={embedded ? "space-y-5" : "mx-auto max-w-6xl space-y-8"}>
      {!embedded ? (
        <header className="relative overflow-hidden rounded-[1.75rem] border border-card-border bg-card px-6 py-8 shadow-luxe sm:px-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 100% 0%, color-mix(in srgb, var(--color-gold) 22%, transparent), transparent 55%), radial-gradient(ellipse 70% 50% at 0% 100%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 50%)",
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
              People · Coaching
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {data.organizationName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              구성원의 모의면접·역량 성장·접속 현황을 한곳에서 보고, 코칭 피드백을 남길 수
              있습니다.
            </p>
          </div>
        </header>
      ) : null}

      {!embedded ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="구성원" value={String(s.memberCount)} hint={`접속 중 ${s.onlineCount}`} />
          <Kpi
            label="이번 주 활동"
            value={String(s.activeThisWeek)}
            hint="로그인 또는 면접"
          />
          <Kpi
            label="완료 면접"
            value={String(s.totalCompletedInterviews)}
            hint="누적 세션"
          />
          <Kpi
            label="평균 백분위"
            value={s.overallAvgPercentile != null ? String(s.overallAvgPercentile) : "—"}
            hint={`상세 동의 ${s.consentCount}명`}
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-card-border bg-card-border sm:grid-cols-3">
          <KpiStrip label="접속 중" value={String(s.onlineCount)} hint="최근 24시간" />
          <KpiStrip
            label="완료 면접"
            value={String(s.totalCompletedInterviews)}
            hint="누적"
          />
          <KpiStrip
            label="평균 백분위"
            value={s.overallAvgPercentile != null ? String(s.overallAvgPercentile) : "—"}
            hint={`동의 ${s.consentCount}명`}
          />
        </section>
      )}

      <section className="rounded-xl border border-card-border bg-card">
        <div className="flex flex-col gap-3 border-b border-card-border px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">구성원 명단</h2>
            <p className="mt-0.5 text-xs text-muted">
              상세 시계열·코칭은 본인 동의 후 「상세」에서 확인합니다.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <PeopleSearchField value={q} onChange={setQ} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-10 rounded-lg border border-card-border bg-background px-3 text-sm"
            >
              <option value="score">백분위순</option>
              <option value="interviews">면접 횟수순</option>
              <option value="delta">향상도순</option>
              <option value="login">최근 로그인순</option>
              <option value="name">이름순</option>
            </select>
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exporting || !hasRoster}
              className="btn-secondary min-h-10 px-3 text-sm disabled:opacity-50"
            >
              {exporting ? "내보내는 중…" : "CSV"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-5 py-3 text-xs sm:px-6">
          {(
            [
              ["all", "전체"],
              ["inactive", "미면접"],
              ["no_consent", "미동의"],
              ["declining", "향상↓"],
              ["online", "접속 중"],
              ["consent", "동의"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg border px-2.5 py-1.5 font-medium transition ${
                filter === id
                  ? "border-foreground bg-foreground text-background"
                  : "border-card-border text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          {s.unreadFeedbackCount > 0 ? (
            <span className="rounded-md bg-muted/15 px-2 py-1 text-muted">
              미열람 피드백 {s.unreadFeedbackCount}
            </span>
          ) : null}
        </div>

        {members.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted sm:px-6">{emptyHint}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-y border-card-border bg-background/40 text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2.5 pl-6 pr-4 font-medium">구성원</th>
                    <th className="py-2.5 pr-4 font-medium">면접</th>
                    <th className="py-2.5 pr-4 font-medium">역량</th>
                    <th className="py-2.5 pr-4 font-medium">추이</th>
                    <th className="py-2.5 pr-4 font-medium">접속</th>
                    <th className="py-2.5 pl-2 pr-6 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <MemberTableRow key={m.id} member={m} />
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-card-border px-5 py-2 lg:hidden sm:px-6">
              {members.map((m) => (
                <li key={m.id} className="py-3">
                  <MemberCard member={m} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-luxe">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-ibm-plex)] text-3xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function KpiStrip({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-card px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-ibm-plex)] text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function MemberTableRow({ member: m }: { member: PeopleMemberRow }) {
  return (
    <tr className="border-b border-card-border/70 last:border-0">
      <td className="py-3.5 pl-6 pr-4">
        <div className="flex items-center gap-2.5">
          <PresenceDot online={m.online} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {m.name}
              <span className="ml-1.5 text-[10px] font-normal text-muted">
                {ORG_ROLE_LABEL[m.orgRole] ?? m.orgRole}
              </span>
            </p>
            <p className="truncate text-xs text-muted">{m.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 pr-4 tabular-nums">
        <span className="font-medium text-foreground">{m.completedInterviews}</span>
        <span className="text-muted">
          {" "}
          / 진행 {m.inProgressInterviews}
        </span>
      </td>
      <td className="py-3.5 pr-4">
        <p className="tabular-nums font-medium">
          {m.avgPercentile != null ? formatPercentile(m.avgPercentile) : "—"}
          {m.deltaPercentile != null ? (
            <span
              className={`ml-1 text-xs ${
                m.deltaPercentile >= 0 ? "text-success" : "text-warning"
              }`}
            >
              {m.deltaPercentile >= 0 ? "+" : ""}
              {m.deltaPercentile}
            </span>
          ) : null}
        </p>
        <p className="text-[11px] text-muted">
          {m.strongestCompetency
            ? `강 ${competencyLabel(m.strongestCompetency)}`
            : "역량 데이터 없음"}
        </p>
      </td>
      <td className="py-3.5 pr-4">
        <Sparkline values={m.sparkline} />
      </td>
      <td className="py-3.5 pr-4 text-xs text-muted">
        <p>IN {formatRelative(m.lastLoginAt)}</p>
        <p>OUT {formatRelative(m.lastLogoutAt)}</p>
      </td>
      <td className="py-3.5 pl-2 pr-6 text-right">
        <Link
          href={`/org/people/${m.id}`}
          className="inline-flex min-h-9 items-center rounded-lg border border-card-border px-3 text-xs font-medium text-foreground hover:bg-background"
        >
          상세
        </Link>
      </td>
    </tr>
  );
}

function MemberCard({ member: m }: { member: PeopleMemberRow }) {
  return (
    <Link
      href={`/org/people/${m.id}`}
      className="block rounded-xl border border-card-border bg-background/40 p-3.5 transition hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <PresenceDot online={m.online} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {m.name}
              <span className="ml-1.5 text-[10px] font-normal text-muted">
                {ORG_ROLE_LABEL[m.orgRole] ?? m.orgRole}
              </span>
            </p>
            <p className="truncate text-xs text-muted">{m.email}</p>
          </div>
        </div>
        <Sparkline values={m.sparkline} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="tabular-nums text-base font-semibold text-foreground">
            {m.completedInterviews}
          </p>
          <p className="text-muted">면접</p>
        </div>
        <div>
          <p className="tabular-nums text-base font-semibold text-foreground">
            {m.avgPercentile != null ? m.avgPercentile : "—"}
          </p>
          <p className="text-muted">백분위</p>
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {formatRelative(m.lastLoginAt).replace(" 전", "")}
          </p>
          <p className="text-muted">로그인</p>
        </div>
      </div>
    </Link>
  );
}

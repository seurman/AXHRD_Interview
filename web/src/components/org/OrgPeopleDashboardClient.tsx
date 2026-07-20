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
      className={`inline-block h-2 w-2 rounded-full ${
        online ? "bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-success)_25%,transparent)]" : "bg-muted/40"
      }`}
      title={online ? "최근 접속" : "오프라인"}
    />
  );
}

type SortKey = "name" | "interviews" | "score" | "login" | "delta";

export function OrgPeopleDashboardClient({ data }: { data: OrgPeopleDashboardData }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [onlyConsent, setOnlyConsent] = useState(false);
  const [onlyOnline, setOnlyOnline] = useState(false);

  const members = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = data.members.filter((m) => {
      if (onlyConsent && !m.coachingConsent) return false;
      if (onlyOnline && !m.online) return false;
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
  }, [data.members, onlyConsent, onlyOnline, q, sort]);

  const s = data.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
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
            구성원의 모의면접·역량 성장·접속 현황을 한곳에서 보고, 코칭 피드백을 남길 수 있습니다.
          </p>
        </div>
      </header>

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

      <section className="rounded-[1.5rem] border border-card-border bg-card/90 p-4 shadow-luxe sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">구성원 명단</h2>
            <p className="text-xs text-muted">
              기관에 소속된 모든 계정(구성원·담당자·관리자)을 표시합니다. 상세 시계열은 본인 동의
              후 열립니다.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <PeopleSearchField value={q} onChange={setQ} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="min-h-11 rounded-xl border border-card-border bg-background px-3 text-sm"
            >
              <option value="score">백분위순</option>
              <option value="interviews">면접 횟수순</option>
              <option value="delta">향상도순</option>
              <option value="login">최근 로그인순</option>
              <option value="name">이름순</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={onlyConsent}
              onChange={(e) => setOnlyConsent(e.target.checked)}
            />
            상세 동의만
          </label>
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={onlyOnline}
              onChange={(e) => setOnlyOnline(e.target.checked)}
            />
            최근 접속만
          </label>
          {s.unreadFeedbackCount > 0 ? (
            <span className="rounded-lg bg-gold/15 px-2 py-1 text-gold">
              미열람 피드백 {s.unreadFeedbackCount}
            </span>
          ) : null}
        </div>

        {members.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted">
            아직 소속 계정이 없습니다. 「멤버·승인」에서 가입을 승인해 주세요.
          </p>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-card-border text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-medium">구성원</th>
                    <th className="py-2 pr-3 font-medium">면접</th>
                    <th className="py-2 pr-3 font-medium">역량</th>
                    <th className="py-2 pr-3 font-medium">추이</th>
                    <th className="py-2 pr-3 font-medium">접속</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <MemberTableRow key={m.id} member={m} />
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-3 lg:hidden">
              {members.map((m) => (
                <li key={m.id}>
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

function MemberTableRow({ member: m }: { member: PeopleMemberRow }) {
  return (
    <tr className="border-b border-card-border/70 last:border-0">
      <td className="py-3 pr-3">
        <div className="flex items-center gap-2">
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
      <td className="py-3 pr-3 tabular-nums">
        <span className="font-medium text-foreground">{m.completedInterviews}</span>
        <span className="text-muted">
          {" "}
          / 진행 {m.inProgressInterviews}
        </span>
      </td>
      <td className="py-3 pr-3">
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
      <td className="py-3 pr-3">
        <Sparkline values={m.sparkline} />
      </td>
      <td className="py-3 pr-3 text-xs text-muted">
        <p>IN {formatRelative(m.lastLoginAt)}</p>
        <p>OUT {formatRelative(m.lastLogoutAt)}</p>
      </td>
      <td className="py-3 text-right">
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
      className="block rounded-2xl border border-card-border bg-background/60 p-4 transition hover:border-primary/30"
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

import Link from "next/link";
import { AdminTodoQueue } from "@/components/admin/AdminTodoQueue";
import {
  OverviewKvRow,
  OverviewPanel,
  OverviewStatusDot,
} from "@/components/admin/OverviewPanel";
import { OverviewSparkline } from "@/components/admin/OverviewSparkline";
import { Badge } from "@/components/admin/Badge";
import { formatRelativeTime } from "@/lib/admin/relative-time";
import type { PlatformHomeSnapshot } from "@/lib/admin/platform-home-data";
import { Check, ChevronRight, ExternalLink } from "lucide-react";

function MetricTile({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`platform-metric-tile block ${highlight ? "platform-metric-tile--alert" : ""}`}
    >
      <p className="text-xs font-semibold text-[var(--platform-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--platform-text)]">{value}</p>
    </Link>
  );
}

export function PlatformHomeDashboard({ snapshot }: { snapshot: PlatformHomeSnapshot }) {
  const urgentCount = snapshot.todos.length;
  const statusTone = snapshot.platformStatus === "ready" ? "ready" : "attention";
  const statusLabel = snapshot.platformStatus === "ready" ? "정상" : "조치 필요";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--platform-text)]">개요</h1>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="platform-btn-secondary"
        >
          서비스 열기
          <ExternalLink className="h-3.5 w-3.5 opacity-60" />
        </a>
      </div>

      <OverviewPanel
        noPadding
        bodyClassName="p-0"
        title="플랫폼 운영 현황"
        action={
          <Link
            href="/admin/organizations"
            className="text-xs font-medium text-[var(--platform-accent)] hover:underline"
          >
            기관 관리 →
          </Link>
        }
      >
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="border-b border-[var(--platform-border)] p-6 lg:border-b-0 lg:border-r">
            <p className="sr-only">플랫폼 운영 현황</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                label="승인 대기"
                value={snapshot.pendingOrgs}
                href="/admin/organizations#pending"
                highlight={snapshot.pendingOrgs > 0}
              />
              <MetricTile
                label="운영 기관"
                value={snapshot.approvedOrgs}
                href="/admin/organizations#active"
              />
              <MetricTile
                label="오늘 면접"
                value={snapshot.sessionsToday}
                href="/admin/sessions"
              />
              <MetricTile
                label="진행 진단"
                value={snapshot.openDiagnosticWaves}
                href="/admin/diagnostic"
              />
            </div>
            {urgentCount > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">긴급 할 일</p>
                  <Badge tone="warning">{urgentCount}건</Badge>
                </div>
                <div className="-mx-2 overflow-hidden rounded-md border border-[var(--platform-border)]">
                  <AdminTodoQueue items={snapshot.todos.slice(0, 4)} />
                </div>
                {urgentCount > 4 && (
                  <p className="mt-2 text-xs text-muted">외 {urgentCount - 4}건 — 체크리스트에서 확인</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 p-6">
            <OverviewKvRow label="상태">
              <OverviewStatusDot tone={statusTone}>{statusLabel}</OverviewStatusDot>
            </OverviewKvRow>
            <OverviewKvRow label="할 일">
              {urgentCount > 0 ? (
                <Link href="/admin/organizations#pending" className="text-amber-700 dark:text-amber-300">
                  {urgentCount}건 대기
                </Link>
              ) : (
                "없음"
              )}
            </OverviewKvRow>
            <OverviewKvRow label="가입 REVIEW">
              {snapshot.reviewFlagUsers > 0 ? (
                <Link href="/admin/users?flag=review" className="text-amber-700 dark:text-amber-300">
                  {snapshot.reviewFlagUsers}명
                </Link>
              ) : (
                "0명"
              )}
            </OverviewKvRow>
            <OverviewKvRow label="소속 멤버">
              {snapshot.membersTotal.toLocaleString("ko-KR")}명
            </OverviewKvRow>
            <OverviewKvRow label="활성 구독">
              <Link href="/admin/subscriptions">{snapshot.activeSubscriptions}건</Link>
            </OverviewKvRow>
            <OverviewKvRow label="ARC 문항뱅크">
              {snapshot.arcIndexSeeded ? (
                <span className="text-emerald-700 dark:text-emerald-400">설치됨</span>
              ) : (
                <Link href="/admin/diagnostic" className="text-amber-700 dark:text-amber-300">
                  미설치
                </Link>
              )}
            </OverviewKvRow>
            <OverviewKvRow label="마지막 감사">
              {snapshot.recentAudit[0] ? (
                <span className="max-w-[14rem] truncate" title={snapshot.recentAudit[0].summary}>
                  {formatRelativeTime(snapshot.recentAudit[0].createdAt)}
                </span>
              ) : (
                "—"
              )}
            </OverviewKvRow>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--platform-border)] px-5 py-3 text-xs text-[var(--platform-text-muted)]">
          <span>모든 수치는 DB 실시간 집계입니다.</span>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/content/assessment"
              className="font-medium text-[var(--platform-accent)] hover:underline"
            >
              역량평가 과제 만들기 →
            </Link>
            <Link href="/admin/audit" className="font-medium text-[var(--platform-accent)] hover:underline">
              감사 로그 →
            </Link>
            <Link href="/admin/settings/features" className="font-medium text-[var(--platform-accent)] hover:underline">
              기능 설정 →
            </Link>
            <Link href="/admin/permissions" className="font-medium text-[var(--platform-accent)] hover:underline">
              권한 매트릭스 →
            </Link>
          </div>
        </div>
      </OverviewPanel>

      {/* 하단 3열 — 체크리스트 · 관측 · 최근 활동 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OverviewPanel
          title={
            <span>
              운영 체크리스트{" "}
              <span className="font-normal text-muted">
                ({snapshot.checklistDone}/{snapshot.checklistTotal})
              </span>
            </span>
          }
        >
          <ul className="space-y-2">
            {snapshot.checklist.map((item) => (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-1 py-2 text-sm transition hover:bg-background/60"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        item.done
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                          : "border-card-border text-transparent"
                      }`}
                    >
                      {item.done && <Check className="h-3 w-3" />}
                    </span>
                    <span className={item.done ? "font-medium text-muted line-through" : "font-semibold text-foreground"}>
                      {item.label}
                    </span>
                    {!item.done && <ChevronRight className="ml-auto h-4 w-4 text-muted" />}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-1 py-2 text-sm">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        item.done ? "border-emerald-500/50 bg-emerald-500/10" : "border-card-border"
                      }`}
                    >
                      {item.done && <Check className="h-3 w-3 text-emerald-600" />}
                    </span>
                    <span className={item.done ? "font-medium text-muted line-through" : "font-semibold text-foreground"}>
                      {item.label}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </OverviewPanel>

        <OverviewPanel title="관측 (6시간)">
          <div className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-muted">면접 세션</p>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {snapshot.sessions6h.toLocaleString("ko-KR")}
                </p>
              </div>
              <OverviewSparkline data={snapshot.sessionsHourly} color="var(--platform-accent)" />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-muted">진단 응답</p>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {snapshot.diagnosticResponses6h.toLocaleString("ko-KR")}
                </p>
              </div>
              <OverviewSparkline data={snapshot.responsesHourly} color="#666" />
            </div>
          </div>
          <Link
            href="/admin/sessions"
            className="mt-4 inline-block text-xs text-accent hover:underline"
          >
            세션 로그 →
          </Link>
        </OverviewPanel>

        <OverviewPanel
          title="최근 활동"
          action={
            <Link href="/admin/audit" className="text-xs text-accent hover:underline">
              전체 →
            </Link>
          }
        >
          {snapshot.recentAudit.length === 0 ? (
            <p className="text-sm text-muted">아직 CMS 변경 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {snapshot.recentAudit.slice(0, 6).map((log) => (
                <li key={log.id} className="border-b border-card-border pb-3 text-sm last:border-0 last:pb-0">
                  <p className="line-clamp-2 font-semibold text-foreground">{log.summary}</p>
                  <p className="mt-1 text-xs text-muted">
                    {log.actorEmail} · {formatRelativeTime(log.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </OverviewPanel>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireSessionsViewer } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Badge } from "@/components/admin/Badge";
import { StatusDot, type DotTone } from "@/components/admin/StatusDot";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { formatRelativeTime } from "@/lib/admin/relative-time";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  SETUP: "준비",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
};

const STATUS_TONE: Record<string, DotTone> = {
  SETUP: "neutral",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
};

const PAGE_SIZE = 50;

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireSessionsViewer("/admin/sessions");
  const { q, status, page: pageParam } = await searchParams;
  const query = q?.trim();
  const statusFilter =
    status === "SETUP" || status === "IN_PROGRESS" || status === "COMPLETED" ? status : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  const where: Prisma.InterviewSessionWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(query
      ? {
          OR: [
            { id: { contains: query, mode: "insensitive" as const } },
            { user: { name: { contains: query, mode: "insensitive" as const } } },
            { user: { email: { contains: query, mode: "insensitive" as const } } },
            { focusCompetency: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    prisma.interviewSession.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            organization: { select: { name: true } },
          },
        },
        _count: { select: { responses: true, chipEvents: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.interviewSession.count({ where }),
  ]);

  const kitOrgIds = [
    ...new Set(sessions.map((s) => s.kitOrganizationId).filter(Boolean)),
  ] as string[];
  const kitOrgs =
    kitOrgIds.length > 0
      ? await prisma.organization.findMany({
          where: { id: { in: kitOrgIds } },
          select: { id: true, name: true },
        })
      : [];
  const kitOrgName = new Map(kitOrgs.map((o) => [o.id, o.name]));

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="면접 세션 · 실행 로그"
        subtitle="실제 사용자가 실행한 면접 세션, 응답 수, 무결성 신호(붙여넣기·탭 이탈), 데모 여부를 조회합니다. 행을 클릭하면 DB 원문(답변·꼬리질문·칩 이벤트)을 볼 수 있습니다."
        links={[
          { href: "/admin/data-storage", label: "데이터 저장 검증 →" },
          { href: "/admin/audit", label: "감사 로그 →" },
          { href: "/admin/users", label: "사용자 권한 →" },
        ]}
      />

      <AdminSection title="검색·필터" description="세션 ID, 사용자, 역량 코드로 필터합니다.">
        <form className="flex flex-wrap gap-2">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="세션 ID, 이름, 이메일, 역량 코드"
            className="input-luxe w-full min-w-0 flex-1 sm:min-w-[14rem]"
          />
          <select name="status" defaultValue={statusFilter ?? ""} className="input-luxe">
            <option value="">전체 상태</option>
            <option value="SETUP">준비</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="COMPLETED">완료</option>
          </select>
          <button type="submit" className="btn-primary px-4">
            검색
          </button>
          {(query || statusFilter) && (
            <Link href="/admin/sessions" className="btn-secondary px-4 py-2 text-sm">
              초기화
            </Link>
          )}
        </form>
      </AdminSection>

      <AdminSection
        title="세션 목록"
        description={`총 ${total}건 중 ${sessions.length}건 표시`}
      >
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">조건에 맞는 세션이 없습니다.</p>
        ) : (
          <ul className="-mx-4 -mb-4 border-t border-card-border sm:-mx-5 sm:-mb-5 lg:-mx-6 lg:-mb-6">
            {sessions.map((s) => {
              const signals: string[] = [];
              if (s.pasteDetected) signals.push("붙여넣기");
              if (s.tabSwitchCount > 0) signals.push(`탭 ${s.tabSwitchCount}회`);
              const orgLabel = s.kitOrganizationId
                ? kitOrgName.get(s.kitOrganizationId) ?? s.kitOrganizationId.slice(0, 8)
                : s.user.organization?.name ?? "—";

              return (
                <li key={s.id} className="border-b border-card-border last:border-0">
                  <Link
                    href={`/admin/sessions/${s.id}`}
                    className="flex flex-col gap-1.5 px-4 py-3.5 text-sm transition hover:bg-background/60 active:bg-background/80 sm:px-5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusDot
                        tone={STATUS_TONE[s.status] ?? "neutral"}
                        className="w-16 shrink-0 sm:w-20"
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                      </StatusDot>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="font-medium text-foreground">
                          {s.user.name ?? "—"}
                        </span>
                        <span className="text-muted"> · {s.user.email}</span>
                      </span>
                      {s.isPresenterDemo && <Badge tone="gold">presenter</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[4.5rem] text-xs text-muted sm:pl-[5.5rem] lg:pl-0 lg:ml-auto">
                      <span>{s.focusCompetency ? competencyLabel(s.focusCompetency) : "—"}</span>
                      <span className="font-mono text-accent">{s.id.slice(0, 8)}…</span>
                      <span>
                        응답 {s._count.responses} · 칩 {s._count.chipEvents}
                      </span>
                      {signals.length > 0 && (
                        <span className="text-warning">{signals.join(" · ")}</span>
                      )}
                      <span className="truncate">{orgLabel}</span>
                      <span>{formatRelativeTime(s.startedAt ?? s.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/sessions"
          searchParams={{ q: query, status: statusFilter }}
        />
      </AdminSection>
    </div>
  );
}

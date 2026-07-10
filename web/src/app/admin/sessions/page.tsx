import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireSuperadmin("/admin/sessions");
  const { q, status } = await searchParams;
  const query = q?.trim();
  const statusFilter =
    status === "SETUP" || status === "IN_PROGRESS" || status === "COMPLETED" ? status : undefined;

  const sessions = await prisma.interviewSession.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query
        ? {
            OR: [
              { id: { contains: query, mode: "insensitive" } },
              { user: { name: { contains: query, mode: "insensitive" } } },
              { user: { email: { contains: query, mode: "insensitive" } } },
              { focusCompetency: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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
    take: 150,
  });

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
          { href: "/admin/audit", label: "감사 로그 →" },
          { href: "/admin/users", label: "사용자 권한 →" },
        ]}
      />

      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="세션 ID, 이름, 이메일, 역량 코드"
          className="input-luxe min-w-[14rem] flex-1"
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
      </form>

      <div className="card-luxe overflow-hidden">
        {sessions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">조건에 맞는 세션이 없습니다.</p>
        ) : (
          <ul>
            {sessions.map((s) => {
              const signals: string[] = [];
              if (s.pasteDetected) signals.push("붙여넣기");
              if (s.tabSwitchCount > 0) signals.push(`탭 ${s.tabSwitchCount}회`);

              return (
                <li key={s.id} className="border-b border-card-border last:border-0">
                  <Link
                    href={`/admin/sessions/${s.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-sm transition hover:bg-background/60"
                  >
                    <StatusDot tone={STATUS_TONE[s.status] ?? "neutral"} className="w-20 shrink-0">
                      {STATUS_LABEL[s.status] ?? s.status}
                    </StatusDot>

                    <span className="min-w-[12rem] flex-1 truncate">
                      <span className="font-medium text-foreground">{s.user.name ?? "—"}</span>
                      <span className="text-muted"> · {s.user.email}</span>
                    </span>

                    {s.isPresenterDemo && <Badge tone="gold">presenter</Badge>}

                    <span className="shrink-0 text-xs text-muted">
                      {s.focusCompetency ? competencyLabel(s.focusCompetency) : "—"}
                    </span>

                    <span className="shrink-0 font-mono text-xs text-accent">
                      {s.id.slice(0, 8)}…
                    </span>

                    <span className="shrink-0 text-xs text-muted">
                      응답 {s._count.responses} · 칩 {s._count.chipEvents}
                    </span>

                    {signals.length > 0 && (
                      <span className="shrink-0 text-xs text-warning">{signals.join(" · ")}</span>
                    )}

                    <span className="shrink-0 text-xs text-muted">
                      {s.kitOrganizationId
                        ? kitOrgName.get(s.kitOrganizationId) ?? s.kitOrganizationId.slice(0, 8)
                        : s.user.organization?.name ?? "—"}
                    </span>

                    <span className="ml-auto shrink-0 text-xs text-muted">
                      {formatRelativeTime(s.startedAt ?? s.createdAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

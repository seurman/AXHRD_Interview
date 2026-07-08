import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  SETUP: "준비",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return "—";
  return value.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Superadmin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">면접 세션 · 실행 로그</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          실제 사용자가 실행한 면접 세션, 응답 수, 무결성 신호(붙여넣기·탭 이탈), 데모 여부를
          조회합니다. 세션 ID를 클릭하면 DB 원문(답변·꼬리질문·칩 이벤트)을 볼 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/audit" className="text-accent hover:underline">
            감사 로그 →
          </Link>
          <Link href="/admin/users" className="text-accent hover:underline">
            사용자 권한 →
          </Link>
        </div>
      </div>

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

      <div className="card-luxe overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-card-border text-xs text-muted">
              <th className="px-4 py-3 font-medium">시작</th>
              <th className="px-4 py-3 font-medium">사용자</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">역량</th>
              <th className="px-4 py-3 font-medium">응답</th>
              <th className="px-4 py-3 font-medium">신호</th>
              <th className="px-4 py-3 font-medium">기관/킷</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-card-border/60 hover:bg-background/50">
                <td className="px-4 py-3 align-top">
                  <Link href={`/admin/sessions/${s.id}`} className="font-mono text-xs text-accent hover:underline">
                    {s.id.slice(0, 10)}…
                  </Link>
                  <p className="mt-1 text-xs text-muted">{formatDate(s.startedAt ?? s.createdAt)}</p>
                  {s.isPresenterDemo && (
                    <span className="mt-1 inline-block rounded bg-gold/15 px-1.5 py-0.5 text-[10px] text-gold">
                      presenter
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-medium text-foreground">{s.user.name ?? "—"}</p>
                  <p className="text-xs text-muted">{s.user.email}</p>
                  {s.user.organization?.name && (
                    <p className="text-xs text-muted">소속: {s.user.organization.name}</p>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <p className="mt-1 text-xs text-muted">#{s.sessionNumber}</p>
                </td>
                <td className="px-4 py-3 align-top text-xs">
                  {s.focusCompetency ? competencyLabel(s.focusCompetency) : "—"}
                  <p className="text-muted">{s.mode}</p>
                </td>
                <td className="px-4 py-3 align-top text-xs">
                  {s._count.responses}건 · 칩 {s._count.chipEvents}
                </td>
                <td className="px-4 py-3 align-top text-xs text-muted">
                  {s.pasteDetected && <span className="text-warning">붙여넣기 </span>}
                  {s.tabSwitchCount > 0 && <span>탭 {s.tabSwitchCount}회 </span>}
                  {!s.pasteDetected && s.tabSwitchCount === 0 && "—"}
                </td>
                <td className="px-4 py-3 align-top text-xs text-muted">
                  {s.kitOrganizationId
                    ? kitOrgName.get(s.kitOrganizationId) ?? s.kitOrganizationId.slice(0, 8)
                    : "—"}
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  조건에 맞는 세션이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

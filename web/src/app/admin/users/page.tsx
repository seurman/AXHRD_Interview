import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { UserRoleEditor } from "@/components/admin/UserRoleEditor";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "학생",
  STAFF: "담당자",
  ADMIN: "기관 관리자",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperadmin("/admin/users");
  const { q } = await searchParams;
  const query = q?.trim();

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.organization.findMany({
      where: { status: "APPROVED" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">전체 사용자 · 권한 관리</h1>
        <p className="mt-1 text-sm text-muted">
          사용자의 소속 기관과 역할(학생/담당자/기관 관리자)을 여기서 직접 변경할 수 있습니다.
          최대 200명까지 표시됩니다 — 이름/이메일로 검색해 좁혀 보세요.
        </p>
        <Link href="/admin/organizations" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← 기관 승인 관리로 돌아가기
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="이름 또는 이메일 검색"
          className="input-luxe flex-1"
        />
        <button type="submit" className="btn-primary px-4">
          검색
        </button>
      </form>

      <div className="card-luxe p-6">
        {users.length === 0 ? (
          <p className="text-sm text-muted">일치하는 사용자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-card-border text-xs text-muted">
                  <th className="py-2 pr-4 font-medium">이름</th>
                  <th className="py-2 pr-4 font-medium">이메일</th>
                  <th className="py-2 pr-4 font-medium">현재 소속 · 역할</th>
                  <th className="py-2 pr-4 font-medium">변경</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-4 text-foreground">{u.name}</td>
                    <td className="py-2 pr-4 text-muted">{u.email}</td>
                    <td className="py-2 pr-4 text-muted">
                      {u.organization
                        ? `${u.organization.name} · ${ROLE_LABEL[u.orgRole]}`
                        : "소속 없음"}
                    </td>
                    <td className="py-2 pr-4">
                      <UserRoleEditor
                        userId={u.id}
                        currentRole={u.orgRole}
                        currentOrgId={u.organizationId}
                        organizations={organizations}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

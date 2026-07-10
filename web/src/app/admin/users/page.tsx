import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { UserRoleEditor } from "@/components/admin/UserRoleEditor";

export const dynamic = "force-dynamic";

import { ORG_ROLE_LABEL, PLATFORM_ROLE_LABEL } from "@/lib/auth/roles";

const ROLE_LABEL = ORG_ROLE_LABEL;
const PLATFORM_LABEL = PLATFORM_ROLE_LABEL;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flag?: string }>;
}) {
  await requireSuperadmin("/admin/users");
  const { q, flag } = await searchParams;
  const query = q?.trim();
  const flagReview = flag === "review";

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(flagReview ? { signupFlag: "REVIEW" } : {}),
      },
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
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Superadmin</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">사용자 권한 관리</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          수퍼어드민만 플랫폼·기관 역할을 부여할 수 있습니다. 가입 이상 패턴(REVIEW) 사용자는
          자동 차단되지 않으며 검토만 표시됩니다.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/admin/audit" className="text-accent hover:underline">
            감사 로그 · 롤백 →
          </Link>
          <Link href="/admin/content" className="text-accent hover:underline">
            문항 뱅크 관리 →
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="이름 또는 이메일 검색"
          className="input-luxe min-w-[12rem] flex-1"
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            name="flag"
            value="review"
            defaultChecked={flagReview}
            className="rounded border-card-border"
          />
          REVIEW만
        </label>
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
                  <th className="py-2 pr-4 font-medium">가입 플래그</th>
                  <th className="py-2 pr-4 font-medium">현재 소속 · 역할</th>
                  <th className="py-2 pr-4 font-medium">플랫폼 권한</th>
                  <th className="py-2 pr-4 font-medium">변경</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-card-border last:border-0">
                    <td className="py-2 pr-4 text-foreground">{u.name}</td>
                    <td className="py-2 pr-4 text-muted">{u.email}</td>
                    <td className="py-2 pr-4">
                      {u.signupFlag === "REVIEW" ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800">
                          REVIEW
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-muted">
                      {u.organization
                        ? `${u.organization.name} · ${ROLE_LABEL[u.orgRole]}`
                        : "소속 없음"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted">
                      {PLATFORM_LABEL[u.platformRole] ?? u.platformRole}
                    </td>
                    <td className="py-2 pr-4">
                      <UserRoleEditor
                        userId={u.id}
                        currentRole={u.orgRole}
                        currentOrgId={u.organizationId}
                        currentPlatformRole={u.platformRole}
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

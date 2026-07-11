import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { UserRoleEditor } from "@/components/admin/UserRoleEditor";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Badge } from "@/components/admin/Badge";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import { ORG_ROLE_LABEL, PLATFORM_ROLE_LABEL } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const ROLE_LABEL = ORG_ROLE_LABEL;
const PLATFORM_LABEL = PLATFORM_ROLE_LABEL;
const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flag?: string; page?: string }>;
}) {
  await requireSuperadmin("/admin/users");
  const { q, flag, page: pageParam } = await searchParams;
  const query = q?.trim();
  const flagReview = flag === "review";
  const page = Math.max(1, Number(pageParam) || 1);

  const where = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(flagReview ? { signupFlag: "REVIEW" as const } : {}),
  };

  const [users, organizations, reviewFlagCount, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.organization.findMany({
      where: { status: "APPROVED" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    flagReview
      ? Promise.resolve(0)
      : prisma.user.count({ where: { signupFlag: "REVIEW" } }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className={ADMIN_CONTAINER.default}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="사용자 권한 관리"
        subtitle="수퍼어드민만 플랫폼·기관 역할을 부여할 수 있습니다. 가입 이상 패턴(REVIEW) 사용자는 자동 차단되지 않으며 검토만 표시됩니다."
        links={[
          { href: "/admin/audit", label: "감사 로그 · 롤백 →" },
          { href: "/admin/content", label: "문항 뱅크 관리 →" },
        ]}
      />

      <AdminSection title="검색·필터" description="이름·이메일 부분 일치. REVIEW 플래그는 가입 이상 패턴 검토용입니다.">
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
          {(query || flagReview) && (
            <Link href="/admin/users" className="btn-secondary px-4 py-2 text-sm">
              초기화
            </Link>
          )}
        </form>
      </AdminSection>

      <AdminSection
        id={flagReview ? "review" : undefined}
        title={flagReview ? "REVIEW 플래그 사용자" : "사용자 목록"}
        description={`총 ${total}건 중 ${users.length}건 표시`}
        actions={
          flagReview ? (
            <Badge tone="warning">{users.length}명</Badge>
          ) : reviewFlagCount > 0 ? (
            <Link href="/admin/users?flag=review" className="text-xs text-accent hover:underline">
              REVIEW {reviewFlagCount}명 →
            </Link>
          ) : undefined
        }
      >
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
                        <Badge tone="warning">REVIEW</Badge>
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
        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/admin/users"
          searchParams={{ q: query, flag }}
        />
      </AdminSection>
    </div>
  );
}

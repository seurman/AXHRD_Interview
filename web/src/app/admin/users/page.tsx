import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireSuperadmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { UserRoleEditor } from "@/components/admin/UserRoleEditor";
import { UserIdentityBadges } from "@/components/admin/UserIdentityBadges";
import { UserSegmentFilters } from "@/components/admin/UserSegmentFilters";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSection } from "@/components/admin/AdminSection";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { Badge } from "@/components/admin/Badge";
import { ADMIN_CONTAINER } from "@/lib/admin/page-shell";
import { PLATFORM_EYEBROW } from "@/lib/admin/eyebrow";
import {
  fetchUserSegmentCounts,
  segmentListTotal,
} from "@/lib/admin/user-segment-counts";
import {
  parseUserSegment,
  userSegmentWhere,
  USER_SEGMENT_OPTIONS,
} from "@/lib/admin/user-identity";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const USER_LIST_SELECT = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  platformRole: true,
  orgRole: true,
  organizationId: true,
  signupFlag: true,
  organization: { select: { name: true } },
} as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; flag?: string; segment?: string; page?: string }>;
}) {
  await requireSuperadmin("/admin/users");
  const { q, flag, segment: segmentParam, page: pageParam } = await searchParams;
  const query = q?.trim();
  const segment =
    flag === "review" ? ("review" as const) : parseUserSegment(segmentParam);
  const page = Math.max(1, Number(pageParam) || 1);

  const baseWhere: Prisma.UserWhereInput = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : {};

  const listWhere: Prisma.UserWhereInput =
    segment === "all"
      ? baseWhere
      : { AND: [baseWhere, userSegmentWhere(segment)] };

  const [users, segmentCounts] = await Promise.all([
    prisma.user.findMany({
      where: listWhere,
      select: USER_LIST_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    fetchUserSegmentCounts(query),
  ]);

  const total = segmentListTotal(segment, segmentCounts);

  const paginationParams = {
    q: query,
    segment: segment === "all" ? undefined : segment,
  };

  return (
    <div className={ADMIN_CONTAINER.wide}>
      <AdminPageHeader
        eyebrow={PLATFORM_EYEBROW.security}
        title="사용자 권한 관리"
        subtitle="플랫폼 운영·기관 담당·구성원을 한 화면에서 구분합니다. 수퍼어드민만 역할을 변경할 수 있습니다."
        links={[
          { href: "/admin/audit", label: "감사 로그 · 롤백 →" },
          { href: "/admin/organizations", label: "기관 목록 →" },
        ]}
      />

      <AdminSection
        title="신원 구분"
        description="플랫폼 직원(내부)과 기관 역할(고객사)을 탭으로 필터합니다. 한 사람이 둘 다 가질 수 있으며, 플랫폼 권한이 있으면 「플랫폼 운영」으로 분류됩니다."
      >
        <UserSegmentFilters active={segment} counts={segmentCounts} query={query} />
      </AdminSection>

      <AdminSection title="검색" description="이름·이메일 부분 일치. 위 신원 필터와 함께 적용됩니다.">
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="segment" value={segment === "all" ? "" : segment} />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="이름 또는 이메일 검색"
            className="input-luxe min-w-[12rem] flex-1"
          />
          <button type="submit" className="btn-primary px-4">
            검색
          </button>
          {(query || segment !== "all") && (
            <Link href="/admin/users" className="btn-secondary px-4 py-2 text-sm">
              초기화
            </Link>
          )}
        </form>
      </AdminSection>

      <AdminSection
        title={
          segment === "all"
            ? "사용자 목록"
            : `사용자 목록 · ${USER_SEGMENT_OPTIONS.find((o) => o.key === segment)?.label ?? segment}`
        }
        description={`총 ${total}건 중 ${users.length}건 표시`}
        actions={
          segmentCounts.review > 0 && segment !== "review" ? (
            <Link
              href={`/admin/users?segment=review${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              className="text-xs text-accent hover:underline"
            >
              REVIEW {segmentCounts.review}명 →
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
                  <th className="py-2 pr-4 font-medium">사용자</th>
                  <th className="py-2 pr-4 font-medium">신원</th>
                  <th className="py-2 pr-4 font-medium">플래그</th>
                  <th className="py-2 pr-4 font-medium">권한 변경</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-card-border align-top last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                      <p className="mt-1 text-[10px] text-muted/80">
                        가입 {u.createdAt.toLocaleDateString("ko-KR")}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <UserIdentityBadges
                        platformRole={u.platformRole}
                        orgRole={u.orgRole}
                        organizationId={u.organizationId}
                        organizationName={u.organization?.name}
                        signupFlag={u.signupFlag}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      {u.signupFlag === "REVIEW" ? (
                        <Badge tone="warning">REVIEW</Badge>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <UserRoleEditor
                        userId={u.id}
                        currentRole={u.orgRole}
                        currentOrgId={u.organizationId}
                        currentPlatformRole={u.platformRole}
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
          searchParams={paginationParams}
        />
      </AdminSection>
    </div>
  );
}

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserIdentitySegment } from "@/lib/admin/user-identity";

export type UserSegmentCounts = Record<UserIdentitySegment, number>;

const SEGMENT_COUNT_SQL = Prisma.sql`
  SELECT
    COUNT(*)::bigint AS all_count,
    COUNT(*) FILTER (WHERE "platformRole" <> 'NONE')::bigint AS platform_count,
    COUNT(*) FILTER (WHERE "organizationId" IS NOT NULL AND "orgRole" = 'ADMIN')::bigint AS org_admin_count,
    COUNT(*) FILTER (WHERE "organizationId" IS NOT NULL AND "orgRole" = 'STAFF')::bigint AS org_staff_count,
    COUNT(*) FILTER (WHERE "organizationId" IS NOT NULL AND "orgRole" IN ('MEMBER', 'STUDENT'))::bigint AS member_count,
    COUNT(*) FILTER (WHERE "organizationId" IS NULL AND "platformRole" = 'NONE')::bigint AS personal_count,
    COUNT(*) FILTER (WHERE "signupFlag" = 'REVIEW')::bigint AS review_count
  FROM "User"
`;

type RawSegmentRow = {
  all_count: bigint;
  platform_count: bigint;
  org_admin_count: bigint;
  org_staff_count: bigint;
  member_count: bigint;
  personal_count: bigint;
  review_count: bigint;
};

function mapSegmentRow(row: RawSegmentRow): UserSegmentCounts {
  return {
    all: Number(row.all_count),
    platform: Number(row.platform_count),
    org_admin: Number(row.org_admin_count),
    org_staff: Number(row.org_staff_count),
    member: Number(row.member_count),
    personal: Number(row.personal_count),
    review: Number(row.review_count),
  };
}

async function queryUserSegmentCounts(query?: string): Promise<UserSegmentCounts> {
  const pattern = query?.trim();
  const rows = pattern
    ? await prisma.$queryRaw<RawSegmentRow[]>`
        SELECT
          COUNT(*)::bigint AS all_count,
          COUNT(*) FILTER (WHERE "platformRole" <> 'NONE')::bigint AS platform_count,
          COUNT(*) FILTER (WHERE "organizationId" IS NOT NULL AND "orgRole" = 'ADMIN')::bigint AS org_admin_count,
          COUNT(*) FILTER (WHERE "organizationId" IS NOT NULL AND "orgRole" = 'STAFF')::bigint AS org_staff_count,
          COUNT(*) FILTER (WHERE "organizationId" IS NOT NULL AND "orgRole" IN ('MEMBER', 'STUDENT'))::bigint AS member_count,
          COUNT(*) FILTER (WHERE "organizationId" IS NULL AND "platformRole" = 'NONE')::bigint AS personal_count,
          COUNT(*) FILTER (WHERE "signupFlag" = 'REVIEW')::bigint AS review_count
        FROM "User"
        WHERE name ILIKE ${`%${pattern}%`} OR email ILIKE ${`%${pattern}%`}
      `
    : await prisma.$queryRaw<RawSegmentRow[]>`${SEGMENT_COUNT_SQL}`;

  return mapSegmentRow(rows[0]);
}

const cachedGlobalSegmentCounts = unstable_cache(
  () => queryUserSegmentCounts(),
  ["admin-user-segment-counts"],
  { revalidate: 30 },
);

/** 신원 탭 카운트 — 검색 없을 때 30초 캐시, 단일 집계 쿼리 */
export async function fetchUserSegmentCounts(query?: string): Promise<UserSegmentCounts> {
  if (query?.trim()) {
    return queryUserSegmentCounts(query);
  }
  return cachedGlobalSegmentCounts();
}

export function segmentListTotal(
  segment: UserIdentitySegment,
  counts: UserSegmentCounts,
): number {
  return counts[segment];
}

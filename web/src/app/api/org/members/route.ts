import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser, isOrgStaffUser, type RoleUser } from "@/lib/auth/roles";
import { getOrgSeatUsage } from "@/lib/org/membership";

function canReview(user: RoleUser) {
  return !!user.organizationId && (isOrgAdminUser(user) || isOrgStaffUser(user));
}

/** 기관 담당자: 멤버 목록 + 승인 대기 큐 + 좌석 사용량 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }

  const orgId = user.organizationId!;
  const [org, pending, members, seats] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        joinCode: true,
        requireMembershipApproval: true,
      },
    }),
    prisma.orgMembershipRequest.findMany({
      where: { organizationId: orgId, status: "PENDING" },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        orgRole: true,
        createdAt: true,
        orgCoachingConsent: true,
      },
      orderBy: [{ orgRole: "asc" }, { name: "asc" }],
    }),
    getOrgSeatUsage(orgId),
  ]);

  if (!org) return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({
    organization: org,
    seats,
    pending: pending.map((p) => ({
      id: p.id,
      message: p.message,
      createdAt: p.createdAt.toISOString(),
      user: {
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        createdAt: p.user.createdAt.toISOString(),
      },
    })),
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      orgRole: m.orgRole,
      createdAt: m.createdAt.toISOString(),
      orgCoachingConsent: m.orgCoachingConsent,
    })),
  });
}

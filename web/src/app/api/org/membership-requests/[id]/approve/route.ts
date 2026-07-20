import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser, isOrgStaffUser, type RoleUser } from "@/lib/auth/roles";
import {
  approveMembershipRequest,
  membershipErrorResponse,
} from "@/lib/org/membership";

type Ctx = { params: Promise<{ id: string }> };

function canReview(user: RoleUser) {
  return !!user.organizationId && (isOrgAdminUser(user) || isOrgStaffUser(user));
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { orgRole?: string };
  const orgRole =
    body.orgRole === "STAFF" ? ("STAFF" as const) : body.orgRole === "MEMBER" ? ("MEMBER" as const) : undefined;

  // STAFF 지정은 기관 ADMIN만
  if (orgRole === "STAFF" && !isOrgAdminUser(user)) {
    return NextResponse.json(
      { error: "담당자 역할로 승인하려면 기관 관리자 권한이 필요합니다." },
      { status: 403 },
    );
  }

  const request = await prisma.orgMembershipRequest.findUnique({
    where: { id },
    select: { organizationId: true },
  });
  if (!request || request.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const result = await approveMembershipRequest(id, user.id, { orgRole });
    const roleLabel = result.orgRole === "STAFF" ? "담당자" : "구성원";
    return NextResponse.json({
      ok: true,
      message: `${result.user.name}님을 ${roleLabel}으로 승인했습니다. 좌석 1명이 배정되었습니다.`,
      user: result.user,
      orgRole: result.orgRole,
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

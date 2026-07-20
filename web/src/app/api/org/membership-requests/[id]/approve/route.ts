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

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !canReview(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const request = await prisma.orgMembershipRequest.findUnique({
    where: { id },
    select: { organizationId: true },
  });
  if (!request || request.organizationId !== user.organizationId) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const result = await approveMembershipRequest(id, user.id);
    return NextResponse.json({
      ok: true,
      message: `${result.user.name}님을 승인했습니다. 좌석 1명이 배정되었습니다.`,
      user: result.user,
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

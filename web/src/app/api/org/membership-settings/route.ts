import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser } from "@/lib/auth/roles";

/** 기관 ADMIN: 승인 필수 토글 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId || !isOrgAdminUser(user)) {
    return NextResponse.json({ error: "기관 관리자 권한이 필요합니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.requireMembershipApproval !== "boolean") {
    return NextResponse.json(
      { error: "requireMembershipApproval(boolean)가 필요합니다." },
      { status: 400 },
    );
  }

  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data: { requireMembershipApproval: body.requireMembershipApproval },
    select: { id: true, name: true, requireMembershipApproval: true },
  });

  return NextResponse.json({ organization: org });
}

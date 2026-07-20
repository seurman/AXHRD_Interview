import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser } from "@/lib/auth/roles";
import { membershipErrorResponse, removeOrgMember } from "@/lib/org/membership";

type Ctx = { params: Promise<{ userId: string }> };

/** DELETE: 기관 ADMIN이 멤버 소속 해제 (좌석 반환) */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId || !isOrgAdminUser(user)) {
    return NextResponse.json({ error: "기관 관리자 권한이 필요합니다." }, { status: 403 });
  }
  const { userId } = await ctx.params;
  try {
    await removeOrgMember(user.organizationId, userId, user.id);
    return NextResponse.json({ ok: true, message: "소속을 해제했습니다. 좌석이 반환됩니다." });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

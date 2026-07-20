import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser } from "@/lib/auth/roles";
import {
  membershipErrorResponse,
  removeOrgMember,
  updateOrgMemberRole,
} from "@/lib/org/membership";

type Ctx = { params: Promise<{ userId: string }> };

/** PATCH: 기관 ADMIN이 MEMBER ↔ STAFF 역할 변경 */
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId || !isOrgAdminUser(user)) {
    return NextResponse.json({ error: "기관 관리자 권한이 필요합니다." }, { status: 403 });
  }
  const { userId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { orgRole?: string };
  const orgRole = body.orgRole === "STAFF" ? "STAFF" : body.orgRole === "MEMBER" ? "MEMBER" : null;
  if (!orgRole) {
    return NextResponse.json(
      { error: "orgRole은 MEMBER 또는 STAFF여야 합니다." },
      { status: 400 },
    );
  }
  try {
    const updated = await updateOrgMemberRole(user.organizationId, userId, user.id, orgRole);
    return NextResponse.json({
      ok: true,
      message: orgRole === "STAFF" ? "담당자로 지정했습니다." : "구성원으로 변경했습니다.",
      user: { id: updated.id, orgRole: updated.orgRole },
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

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

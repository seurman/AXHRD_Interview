import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser } from "@/lib/auth/roles";
import { membershipErrorResponse } from "@/lib/org/membership";
import { revokeOrgInvitation } from "@/lib/org/invitations";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE: 초대 취소 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user?.organizationId || !isOrgAdminUser(user)) {
    return NextResponse.json({ error: "기관 관리자 권한이 필요합니다." }, { status: 403 });
  }
  const { id } = await ctx.params;
  try {
    await revokeOrgInvitation(user.organizationId, id);
    return NextResponse.json({ ok: true, message: "초대를 취소했습니다." });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { membershipErrorResponse } from "@/lib/org/membership";
import { acceptOrgInvitation, getInvitationByToken } from "@/lib/org/invitations";

type Ctx = { params: Promise<{ token: string }> };

/** GET: 초대 메타 (공개) */
export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const invite = await getInvitationByToken(token);
  if (!invite || invite.status !== "PENDING") {
    return NextResponse.json({ error: "유효하지 않은 초대입니다." }, { status: 404 });
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "만료된 초대입니다." }, { status: 410 });
  }
  return NextResponse.json({
    email: invite.email,
    organization: invite.organization,
    orgRole: invite.orgRole,
    expiresAt: invite.expiresAt.toISOString(),
  });
}

/** POST: 로그인 사용자가 초대 수락 */
export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { token } = await ctx.params;
  try {
    const result = await acceptOrgInvitation(token, user.id);
    return NextResponse.json({
      ok: true,
      message: `${result.organization.name}에 소속되었습니다.`,
      ...result,
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

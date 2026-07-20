import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { cancelMembershipRequest, membershipErrorResponse } from "@/lib/org/membership";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE: 신청자가 대기 요청 취소 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { id } = await ctx.params;
  try {
    await cancelMembershipRequest(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

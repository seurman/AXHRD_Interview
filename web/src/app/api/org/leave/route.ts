import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { leaveOrganization, membershipErrorResponse } from "@/lib/org/membership";

/** POST: 본인 기관 탈퇴 (좌석 반환) */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  try {
    await leaveOrganization(user.id);
    return NextResponse.json({
      ok: true,
      message: "기관 소속을 해제했습니다. 좌석이 반환됩니다.",
      redirect: "/org/setup",
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

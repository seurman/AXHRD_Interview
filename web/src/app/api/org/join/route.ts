import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createMembershipRequest,
  membershipErrorResponse,
} from "@/lib/org/membership";

/**
 * 가입 코드로 소속 요청 — 승인 필수 기관은 PENDING, 아니면 즉시 소속.
 * (하위호환: 기존 /api/org/join 유지)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`org:join:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawCode = typeof body.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "가입 코드를 입력해 주세요." }, { status: 400 });
  }

  try {
    const result = await createMembershipRequest({
      userId: user.id,
      joinCode: rawCode,
      message: typeof body.message === "string" ? body.message : null,
    });
    if (result.mode === "joined") {
      return NextResponse.json({
        organizationName: result.organization.name,
        mode: "joined",
      });
    }
    return NextResponse.json({
      organizationName: result.organization.name,
      mode: "pending",
      requestId: result.request.id,
      message: "담당자 승인 대기 중입니다. 승인되면 좌석이 배정됩니다.",
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

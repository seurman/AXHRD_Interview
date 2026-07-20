import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createMembershipRequest,
  getPendingRequestForUser,
  membershipErrorResponse,
} from "@/lib/org/membership";

/** GET: 내 승인 대기 요청 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const pending = await getPendingRequestForUser(user.id);
  return NextResponse.json({
    pending: pending
      ? {
          id: pending.id,
          status: pending.status,
          message: pending.message,
          createdAt: pending.createdAt.toISOString(),
          organization: pending.organization,
        }
      : null,
    organizationId: user.organizationId,
  });
}

/**
 * POST: 기관 소속 요청 (기관 선택 또는 가입 코드).
 * requireMembershipApproval=true면 PENDING, false면 즉시 MEMBER.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const rl = checkRateLimit(`org:membership:${user.id}`, 15, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  try {
    const result = await createMembershipRequest({
      userId: user.id,
      organizationId: typeof body.organizationId === "string" ? body.organizationId : undefined,
      joinCode: typeof body.joinCode === "string" ? body.joinCode : undefined,
      message: typeof body.message === "string" ? body.message : null,
    });
    if (result.mode === "joined") {
      return NextResponse.json({
        ok: true,
        mode: "joined",
        organizationName: result.organization.name,
        message: `${result.organization.name}에 소속되었습니다.`,
      });
    }
    return NextResponse.json({
      ok: true,
      mode: "pending",
      organizationName: result.organization.name,
      requestId: result.request.id,
      message: `${result.organization.name} 담당자 승인 대기 중입니다. 승인되면 좌석이 배정됩니다.`,
    });
  } catch (e) {
    const err = membershipErrorResponse(e);
    return NextResponse.json(err.body, { status: err.status });
  }
}

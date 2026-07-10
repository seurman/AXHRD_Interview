import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkUsageLimit } from "@/lib/billing/usage";
import { startInterviewSession, type StartSessionBody } from "@/lib/interview/start-session";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  const rl = checkRateLimit(`interview:start:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "면접 세션 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const usage = await checkUsageLimit(user.id, "mock_interview");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.message,
        code: "PLAN_LIMIT_EXCEEDED",
        upgradeUrl: usage.upgradeUrl,
        used: usage.used,
        limit: usage.limit,
      },
      { status: 402 }
    );
  }

  const body = (await req.json()) as StartSessionBody;
  const result = await startInterviewSession(user, body);
  return NextResponse.json(result.body, { status: result.status });
}

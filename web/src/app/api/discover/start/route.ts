import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { blockPersonalTrialApi } from "@/lib/auth/personal-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkUsageLimit } from "@/lib/billing/usage";
import { DISCOVER_QUESTIONS } from "@/lib/discover/questions";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  const trialBlock = await blockPersonalTrialApi(user);
  if (trialBlock) return trialBlock;

  const rl = checkRateLimit(`discover:start:${user.id}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const usage = await checkUsageLimit(user.id, "self_discovery");
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

  const session = await prisma.selfDiscoverySession.create({
    data: { userId: user.id },
  });

  const first = DISCOVER_QUESTIONS[0];

  return NextResponse.json({
    sessionId: session.id,
    questionIndex: 0,
    totalQuestions: DISCOVER_QUESTIONS.length,
    currentQuestion: {
      code: first.code,
      text: first.text,
      hint: first.hint,
    },
  });
}

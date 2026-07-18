import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { gradeAssessmentAttempt } from "@/lib/assessment/grade-attempt";
import {
  candidateTurnCount,
  parseDialogue,
} from "@/lib/assessment/role-play-engine";

export const maxDuration = 90;

type Ctx = { params: Promise<{ attemptId: string }> };

/** 제출 + 채점(1회). 역할연기는 최소 1턴, 서류함은 전체 아이템 응답 필요. */
export async function POST(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }
  const { attemptId } = await params;

  const rl = checkRateLimit(`assessment:submit:${user.id}`, 6, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      scenario: {
        select: { kind: true, _count: { select: { inBasketItems: true } } },
      },
      itemResponses: { select: { responseText: true } },
      report: { select: { id: true } },
    },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "시도를 찾을 수 없습니다." }, { status: 404 });
  }
  if (attempt.status === "SCORED" && attempt.report) {
    return NextResponse.json({ scored: true, attemptId: attempt.id });
  }

  if (attempt.scenario.kind === "ROLE_PLAY") {
    const turns = candidateTurnCount(parseDialogue(attempt.dialogueJson));
    if (turns < 1) {
      return NextResponse.json(
        { error: "최소 1회 이상 발화한 뒤 제출할 수 있습니다." },
        { status: 400 },
      );
    }
  } else {
    const totalItems = attempt.scenario._count.inBasketItems;
    const answered = attempt.itemResponses.filter(
      (r) => r.responseText.trim().length > 0,
    ).length;
    if (answered < totalItems) {
      return NextResponse.json(
        {
          error: `모든 항목을 처리해야 제출할 수 있습니다. (${answered}/${totalItems})`,
          answered,
          totalItems,
        },
        { status: 400 },
      );
    }
  }

  // 먼저 SUBMITTED로 전이(채점 실패해도 응시 완료 상태 유지)
  await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  const result = await gradeAssessmentAttempt(attempt.id);
  if (!result) {
    return NextResponse.json({ error: "채점에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    scored: result.graded,
    attemptId: attempt.id,
    overallScore: result.report.overallScore,
  });
}

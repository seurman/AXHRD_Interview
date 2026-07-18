import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  SCENARIO_WITH_FRAMEWORK_INCLUDE,
  toCandidateScenarioPayload,
} from "@/lib/assessment/load-scenario-context";
import { parseDialogue } from "@/lib/assessment/role-play-engine";

type Ctx = { params: Promise<{ attemptId: string }> };

/** 내 시도 현재 상태(재개용) — 본인만 */
export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }
  const { attemptId } = await params;

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      scenario: { include: SCENARIO_WITH_FRAMEWORK_INCLUDE },
      itemResponses: {
        select: { itemId: true, actionType: true, responseText: true },
      },
    },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "시도를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    attemptId: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    scenario: toCandidateScenarioPayload(attempt.scenario),
    dialogue: parseDialogue(attempt.dialogueJson),
    itemResponses: attempt.itemResponses,
  });
}

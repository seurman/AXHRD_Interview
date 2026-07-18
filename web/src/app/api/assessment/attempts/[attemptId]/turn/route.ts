import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  candidateTurnCount,
  generatePersonaTurn,
  parseDialogue,
  type DialogueTurn,
} from "@/lib/assessment/role-play-engine";
import type { Prisma } from "@prisma/client";

export const maxDuration = 60;

type Ctx = { params: Promise<{ attemptId: string }> };

type Body = { message?: string };

const MAX_MESSAGE_LENGTH = 2000;

/** 역할연기 — 응시자 발화 1턴 + 상대역 응답 1턴 */
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 },
    );
  }
  const { attemptId } = await params;

  const rl = checkRateLimit(`assessment:turn:${user.id}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "발화 내용을 입력해 주세요." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `발화는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.` },
      { status: 400 },
    );
  }

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { scenario: true },
  });
  if (!attempt || attempt.userId !== user.id) {
    return NextResponse.json({ error: "시도를 찾을 수 없습니다." }, { status: 404 });
  }
  if (attempt.scenario.kind !== "ROLE_PLAY") {
    return NextResponse.json(
      { error: "역할연기 과제가 아닙니다." },
      { status: 400 },
    );
  }
  if (attempt.status !== "IN_PROGRESS" && attempt.status !== "DRAFT") {
    return NextResponse.json(
      { error: "이미 제출된 시도입니다." },
      { status: 409 },
    );
  }

  const dialogue = parseDialogue(attempt.dialogueJson);
  const priorTurns = candidateTurnCount(dialogue);
  if (priorTurns >= attempt.scenario.maxTurns) {
    return NextResponse.json(
      {
        error: "대화 턴을 모두 사용했습니다. 제출해 주세요.",
        turnsUsed: priorTurns,
        maxTurns: attempt.scenario.maxTurns,
        canContinue: false,
      },
      { status: 409 },
    );
  }

  const candidateTurn: DialogueTurn = {
    role: "CANDIDATE",
    text: message,
    at: Date.now(),
  };
  const withCandidate = [...dialogue, candidateTurn];

  const persona = await generatePersonaTurn(
    {
      titleKo: attempt.scenario.titleKo,
      taskBrief: attempt.scenario.taskBrief,
      roleContext: attempt.scenario.roleContext,
      personaName: attempt.scenario.personaName,
      personaRole: attempt.scenario.personaRole,
      personaProfile: attempt.scenario.personaProfile,
      maxTurns: attempt.scenario.maxTurns,
    },
    withCandidate,
  );

  const personaTurn: DialogueTurn = {
    role: "PERSONA",
    text: persona.reply,
    at: Date.now(),
  };
  const nextDialogue = [...withCandidate, personaTurn];
  const turnsUsed = candidateTurnCount(nextDialogue);

  await prisma.assessmentAttempt.update({
    where: { id: attempt.id },
    data: {
      status: "IN_PROGRESS",
      startedAt: attempt.startedAt ?? new Date(),
      dialogueJson: nextDialogue as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    reply: persona.reply,
    turnsUsed,
    maxTurns: attempt.scenario.maxTurns,
    canContinue: turnsUsed < attempt.scenario.maxTurns,
  });
}

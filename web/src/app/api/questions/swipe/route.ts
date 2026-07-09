import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { blockPersonalTrialApi } from "@/lib/auth/personal-access";
import {
  appendUserTextRecord,
  formatSwipeSelectionText,
} from "@/lib/user-text-archive";

/** 질문 카드 Pass/Save 기록 — 채점과 무관, 열람 상태만 저장(같은 카드 재스와이프 시 갱신) */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const trialBlock = await blockPersonalTrialApi(user);
  if (trialBlock) return trialBlock;

  const body = await req.json();
  const {
    questionId,
    action: rawAction,
    answerTranscript,
  } = body as { questionId?: string; action?: string; answerTranscript?: string };

  if (!questionId || (rawAction !== "PASS" && rawAction !== "SAVE")) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const action: "PASS" | "SAVE" = rawAction;
  const trimmedAnswer = answerTranscript?.trim() || undefined;

  const question = await prisma.realInterviewQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, questionText: true, industry: true, jobRole: true },
  });
  if (!question) {
    return NextResponse.json({ error: "존재하지 않는 질문입니다." }, { status: 404 });
  }

  await prisma.swipeAction.upsert({
    where: { userId_questionId: { userId: user.id, questionId } },
    create: {
      userId: user.id,
      questionId,
      action,
      ...(trimmedAnswer && { answerTranscript: trimmedAnswer, answeredAt: new Date() }),
    },
    update: {
      action,
      ...(trimmedAnswer && { answerTranscript: trimmedAnswer, answeredAt: new Date() }),
    },
  });

  void appendUserTextRecord({
    userId: user.id,
    kind: trimmedAnswer ? "SWIPE_PRACTICE" : "SWIPE_SELECTION",
    content: formatSwipeSelectionText({
      action,
      industry: question.industry,
      jobRole: question.jobRole,
      question: question.questionText,
      practiceAnswer: trimmedAnswer,
    }),
    sourceType: "swipe_action",
    sourceId: questionId,
  });

  return NextResponse.json({ ok: true });
}

/** 저장한(SAVE) 질문 목록 조회 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const saved = await prisma.swipeAction.findMany({
    where: { userId: user.id, action: "SAVE" },
    orderBy: { updatedAt: "desc" },
    include: { question: true },
  });

  return NextResponse.json({
    saved: saved.map((s) => ({
      id: s.question.id,
      text: s.question.questionText,
      industry: s.question.industry,
      jobRole: s.question.jobRole,
      savedAt: s.updatedAt,
      answerTranscript: s.answerTranscript,
      answeredAt: s.answeredAt,
    })),
  });
}

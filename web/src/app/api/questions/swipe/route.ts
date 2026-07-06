import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

/** 질문 카드 Pass/Save 기록 — 채점과 무관, 열람 상태만 저장(같은 카드 재스와이프 시 갱신) */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

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
    select: { id: true },
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
      sourceName: s.question.sourceName,
      sourceUrl: s.question.sourceUrl,
      isAiExample: s.question.isAiExample,
      savedAt: s.updatedAt,
      answerTranscript: s.answerTranscript,
      answeredAt: s.answeredAt,
    })),
  });
}

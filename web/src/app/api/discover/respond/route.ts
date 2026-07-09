import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { blockPersonalTrialApi } from "@/lib/auth/personal-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { DISCOVER_QUESTIONS } from "@/lib/discover/questions";
import { generateDiscoverProfile } from "@/lib/discover/profile-generator";
import {
  appendUserTextRecord,
  formatSelfDiscoveryAnswerText,
} from "@/lib/user-text-archive";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", redirect: "/auth/login" },
      { status: 401 }
    );
  }

  const trialBlock = await blockPersonalTrialApi(user);
  if (trialBlock) return trialBlock;

  const rl = checkRateLimit(`discover:respond:${user.id}`, 30, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { sessionId, questionCode, answerText } = await req.json();

  if (!sessionId || !questionCode || !answerText?.trim()) {
    return NextResponse.json(
      { error: "세션, 질문, 답변이 필요합니다." },
      { status: 400 }
    );
  }

  const session = await prisma.selfDiscoverySession.findUnique({
    where: { id: sessionId },
    include: { responses: { orderBy: { order: "asc" } } },
  });

  if (!session) {
    return NextResponse.json({ error: "세션을 찾을 수 없습니다." }, { status: 404 });
  }
  if (session.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (session.status === "COMPLETED") {
    return NextResponse.json(
      { error: "이미 완료된 세션입니다.", redirectUrl: `/discover/${sessionId}/report` },
      { status: 400 }
    );
  }

  const questionIndex = session.responses.length;
  const expected = DISCOVER_QUESTIONS[questionIndex];
  if (!expected || expected.code !== questionCode) {
    return NextResponse.json({ error: "질문 순서가 맞지 않습니다." }, { status: 400 });
  }

  await prisma.selfDiscoveryResponse.create({
    data: {
      sessionId,
      questionCode: expected.code,
      questionText: expected.text,
      answerText: answerText.trim(),
      order: questionIndex,
    },
  });

  void appendUserTextRecord({
    userId: user.id,
    kind: "SELF_DISCOVERY_ANSWER",
    content: formatSelfDiscoveryAnswerText({
      questionCode: expected.code,
      question: expected.text,
      answer: answerText.trim(),
    }),
    sourceType: "self_discovery_session",
    sourceId: sessionId,
  });

  const nextIndex = questionIndex + 1;
  const isLast = nextIndex >= DISCOVER_QUESTIONS.length;

  if (!isLast) {
    const next = DISCOVER_QUESTIONS[nextIndex];
    return NextResponse.json({
      completed: false,
      questionIndex: nextIndex,
      totalQuestions: DISCOVER_QUESTIONS.length,
      nextQuestion: {
        code: next.code,
        text: next.text,
        hint: next.hint,
      },
    });
  }

  const allResponses = await prisma.selfDiscoveryResponse.findMany({
    where: { sessionId },
    orderBy: { order: "asc" },
  });

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  const profileData = await generateDiscoverProfile({
    responses: allResponses.map((r) => ({
      questionCode: r.questionCode,
      questionText: r.questionText,
      answerText: r.answerText,
    })),
    userName: user.name,
    jobRole: fullUser?.profile?.desiredJobRole ?? "OTHER",
  });

  await prisma.$transaction([
    prisma.selfDiscoverySession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
    prisma.selfDiscoveryProfile.upsert({
      where: { sessionId },
      create: {
        sessionId,
        strengths: profileData.strengths as unknown as Prisma.InputJsonValue,
        weaknesses: profileData.weaknesses as unknown as Prisma.InputJsonValue,
        values: profileData.values as unknown as Prisma.InputJsonValue,
        competencySignals: profileData.competencySignals as unknown as Prisma.InputJsonValue,
        interviewAdvice: (profileData.interviewAdvice ?? []) as unknown as Prisma.InputJsonValue,
        narrativeSummary: profileData.narrativeSummary,
      },
      update: {
        strengths: profileData.strengths as unknown as Prisma.InputJsonValue,
        weaknesses: profileData.weaknesses as unknown as Prisma.InputJsonValue,
        values: profileData.values as unknown as Prisma.InputJsonValue,
        competencySignals: profileData.competencySignals as unknown as Prisma.InputJsonValue,
        interviewAdvice: (profileData.interviewAdvice ?? []) as unknown as Prisma.InputJsonValue,
        narrativeSummary: profileData.narrativeSummary,
        generatedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({
    completed: true,
    redirectUrl: `/discover/${sessionId}/report`,
  });
}

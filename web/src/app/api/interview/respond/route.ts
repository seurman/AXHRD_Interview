import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { submitIrtResponse, getIrtSessionSummary } from "@/lib/irt-client";
import { evaluateAnswer, type RubricResult } from "@/lib/gemini/evaluate";
import { correctTranscript } from "@/lib/gemini/correct-transcript";
import { parseIrtState, serializeIrtState, type StoredIrtState } from "@/lib/irt-state";
import { shouldTriggerFollowUp, pickFollowUpQuestion } from "@/lib/interview/follow-up";
import { buildPersonalizedQuestion } from "@/lib/interview/build-question";
import { buildQuestionRationale } from "@/lib/interview/rationale";
import { generateCompetencyFeedback } from "@/lib/claude/competency-feedback";
import {
  markPlanCompleteIfNeeded,
  syncCompetencyProgress,
} from "@/lib/candidate/service";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import type { CompetencyState, ItemParams } from "@/types";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", redirect: "/auth/login" },
        { status: 401 }
      );
    }

    // 매 응답마다 Gemini 채점 + 질문 개인화(유료 API)를 호출하므로
    // 로그인 사용자 기준으로 방어한다.
    const rl = checkRateLimit(`interview:respond:${user.id}`, 40, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }

    return await handleRespond(req, user.id);
  } catch (e) {
    console.error("[interview/respond]", e);
    const message = e instanceof Error ? e.message : "답변 처리 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleRespond(req: Request, userId: string) {
  const { sessionId, questionId, transcript, durationSec } = await req.json();

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      resume: true,
      targetCompany: true,
      responses: true,
      plan: true,
    },
  });

  if (!session || session.status === "COMPLETED") {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  // 세션 소유권 검증 — 다른 사용자의 세션에 응답을 제출하지 못하도록 차단
  if (session.userId !== userId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { competency: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const stored = parseIrtState(session.irtState);
  const displayedQuestion =
    stored.personalizedQuestions?.[question.externalId]?.text ?? question.template;
  const rubricCriteria = stored.personalizedQuestions?.[question.externalId]?.rubric;

  const focusCompetency =
    session.focusCompetency ?? question.competency.code;
  const isCompetencyMode = session.mode === "COMPETENCY";
  const maxItemsPerCompetency = isCompetencyMode ? 3 : 18;

  // 진행 중인 꼬리질문에 대한 답변인지 확인 — 서버 상태(irtState.pendingFollowUp)가
  // 기준이며 클라이언트는 별도 플래그를 보낼 필요가 없다.
  const pending = stored.pendingFollowUp;
  const isFollowUpAnswer = !!pending && pending.questionId === questionId;

  // Web Speech API STT 오인식(예: "병목"→"병 먹고") 교정 — 원문(transcript)은 그대로 DB에 남기고
  // 채점·이후 인용에는 교정본을 쓴다.
  const correctedAnswer = await correctTranscript(transcript);

  let rubric: RubricResult;
  let finalTranscript: string;
  let finalCorrectedTranscript: string | null;
  let finalDurationSec: number | null;

  if (isFollowUpAnswer && pending) {
    // 꼬리질문 답변 — 원 답변 + 꼬리질문 답변을 함께 최종 평가한다 (추가 API 호출 1회,
    // 원 답변 채점 시 이미 낸 판단을 뒤집는 게 아니라 보완하는 개념).
    const combinedQuestion = `${displayedQuestion}\n\n[꼬리질문] ${pending.followUpQuestion}`;
    const combinedAnswer = `[최초 답변]\n${
      pending.originalCorrectedTranscript ?? pending.originalTranscript
    }\n\n[꼬리질문에 대한 답변]\n${correctedAnswer}`;

    rubric = await evaluateAnswer({
      question: combinedQuestion,
      answer: combinedAnswer,
      competency: question.competency.code,
      resumeContext: session.resume?.rawText,
      rubricCriteria,
    });

    finalTranscript = pending.originalTranscript;
    finalCorrectedTranscript = pending.originalCorrectedTranscript;
    finalDurationSec = pending.originalDurationSec;
  } else {
    rubric = await evaluateAnswer({
      question: displayedQuestion,
      answer: correctedAnswer,
      competency: question.competency.code,
      resumeContext: session.resume?.rawText,
      rubricCriteria,
    });

    if (shouldTriggerFollowUp(rubric)) {
      const followUpQuestion = pickFollowUpQuestion(question.followUpHints, correctedAnswer);

      const updatedState: StoredIrtState = {
        ...stored,
        pendingFollowUp: {
          questionId,
          followUpQuestion,
          originalTranscript: transcript,
          originalCorrectedTranscript: correctedAnswer !== transcript ? correctedAnswer : null,
          originalScore: rubric.score,
          originalDimensions: rubric.dimensions,
          originalBriefFeedback: rubric.briefFeedback,
          originalDurationSec: typeof durationSec === "number" ? Math.round(durationSec) : null,
        },
      };

      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { irtState: serializeIrtState(updatedState) },
      });

      // IRT 엔진 호출도, ResponseRecord/ChipEvent 기록도 아직 하지 않는다 —
      // 이 문항은 꼬리질문 답변까지 받은 뒤 한 번에 확정한다.
      return NextResponse.json({
        isFollowUp: true,
        competencyStates: stored.competencies,
        chipEvent: null,
        nextQuestion: {
          id: question.id,
          externalId: question.externalId,
          competency: question.competency.code,
          level: question.level,
          text: question.template,
          personalizedText: followUpQuestion,
          rationale: "답변을 조금 더 구체화하기 위한 후속 질문입니다.",
          isFollowUp: true,
        },
        shouldTerminate: false,
        totalItems: stored.administeredIds.length,
        administeredIds: stored.administeredIds,
        redirectUrl: null,
        planId: stored.planId,
        focusCompetency,
        nextCompetency: null,
        maxItemsPerCompetency,
      });
    }

    finalTranscript = transcript;
    finalCorrectedTranscript = correctedAnswer !== transcript ? correctedAnswer : null;
    finalDurationSec = typeof durationSec === "number" ? Math.round(durationSec) : null;
  }

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      ...(isCompetencyMode
        ? { competency: { code: focusCompetency } }
        : {}),
    },
    include: { competency: true },
  });

  const itemPool: ItemParams[] = questions.map((q) => ({
    item_id: q.externalId,
    competency: q.competency.code,
    difficulty: q.difficulty,
    discrimination: q.discrimination,
    level: q.level,
  }));

  const irtState = stored.competencies;
  const administeredIds = [
    ...new Set([
      ...stored.administeredIds,
      ...session.responses
        .map((r) => questions.find((q) => q.id === r.questionId)?.externalId ?? "")
        .filter(Boolean),
    ]),
  ];

  const irtResult = await submitIrtResponse({
    sessionId,
    itemId: question.externalId,
    competency: question.competency.code,
    rubricScore: rubric.score,
    itemPool,
    administeredIds: [...administeredIds, question.externalId],
    competencyStates: irtState,
    focusCompetency: isCompetencyMode ? focusCompetency : undefined,
    mode: isCompetencyMode ? "competency" : "full",
    minItems: isCompetencyMode ? 2 : 8,
    maxItems: isCompetencyMode ? 3 : 18,
  });

  const chipTypeMap: Record<string, "PASS" | "ATTEMPT" | "DOWNGRADE"> = {
    pass: "PASS",
    attempt: "ATTEMPT",
    downgrade: "DOWNGRADE",
  };

  await prisma.responseRecord.create({
    data: {
      sessionId,
      questionId,
      competency: question.competency.code,
      level: question.level,
      transcript: finalTranscript,
      correctedTranscript: finalCorrectedTranscript,
      rubricScore: rubric.score,
      durationSec: finalDurationSec,
      initialRubricScore: isFollowUpAnswer && pending ? pending.originalScore : null,
      followUpQuestion: isFollowUpAnswer && pending ? pending.followUpQuestion : null,
      followUpTranscript: isFollowUpAnswer ? transcript : null,
      followUpCorrectedTranscript:
        isFollowUpAnswer && correctedAnswer !== transcript ? correctedAnswer : null,
    },
  });

  await prisma.chipEvent.create({
    data: {
      sessionId,
      competency: irtResult.chip_event.competency,
      level: irtResult.chip_event.level,
      chipType: chipTypeMap[irtResult.chip_event.chip_type],
      rubricScore: irtResult.chip_event.rubric_score,
      briefFeedback:
        rubric.briefFeedback || irtResult.chip_event.brief_feedback,
      hadFollowUp: isFollowUpAnswer,
      sequence: session.responses.length,
    },
  });

  const updatedAdministered = [...administeredIds, question.externalId];
  const planId = stored.planId ?? session.planId ?? undefined;

  const updatedState = {
    competencies: irtResult.competency_states,
    nextItemId: irtResult.next_item?.item_id,
    administeredIds: updatedAdministered,
    focusCompetency,
    planId,
    personalizedQuestions: stored.personalizedQuestions,
    usedHighlights: stored.usedHighlights,
  };

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      irtState: serializeIrtState(updatedState),
    },
  });

  let nextQuestion = null;
  if (irtResult.next_item) {
    const next = await prisma.question.findUnique({
      where: { externalId: irtResult.next_item.item_id },
      include: { competency: true },
    });
    if (next) {
      const rationale = buildQuestionRationale({
        level: irtResult.next_item.target_level,
        expectedInformation: irtResult.next_item.expected_information,
      });
      nextQuestion = await buildPersonalizedQuestion(
        { ...session, irtState: serializeIrtState(updatedState) },
        next,
        rationale
      );
    }
  }

  let redirectUrl: string | null = null;
  let nextCompetency: string | null = null;

  if (irtResult.should_terminate) {
    if (isCompetencyMode && planId && focusCompetency) {
      redirectUrl = await finalizeCompetencySession({
        sessionId,
        planId,
        focusCompetency,
        states: irtResult.competency_states,
        userId: session.userId,
        companyName: session.targetCompany?.name,
        jobRole: session.jobRole,
      });
    } else {
      await finalizeFullSession(sessionId, irtResult.competency_states);
      redirectUrl = `/interview/${sessionId}/report`;
    }
  }

  if (planId && redirectUrl?.includes("/feedback")) {
    const progress = await prisma.competencyProgress.findMany({
      where: { planId },
    });
    const pendingProgress = progress.find((p) => p.status !== "COMPLETED");
    nextCompetency = pendingProgress?.competency ?? null;
  }

  return NextResponse.json({
    competencyStates: irtResult.competency_states,
    chipEvent: {
      ...irtResult.chip_event,
      had_follow_up: isFollowUpAnswer,
      brief_feedback: rubric.briefFeedback,
    },
    nextQuestion,
    shouldTerminate: irtResult.should_terminate,
    totalItems: irtResult.total_items,
    administeredIds: updatedAdministered,
    redirectUrl,
    planId,
    focusCompetency,
    nextCompetency,
    maxItemsPerCompetency: isCompetencyMode ? 3 : 18,
  });
}

async function finalizeCompetencySession(params: {
  sessionId: string;
  planId: string;
  focusCompetency: string;
  states: Record<string, CompetencyState>;
  userId: string;
  companyName?: string;
  jobRole?: string;
}) {
  const summary = await getIrtSessionSummary({
    sessionId: params.sessionId,
    competencyStates: params.states,
  });

  const compSummary =
    summary.competencies.find((c) => c.competency === params.focusCompetency) ??
    summary.competencies[0];

  if (!compSummary) {
    throw new Error("역량 요약 데이터를 만들 수 없습니다.");
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: params.sessionId },
    include: { responses: { include: { question: true } } },
  });

  if (!session) return null;

  await prisma.interviewSession.update({
    where: { id: params.sessionId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      overallTheta: compSummary?.theta,
    },
  });

  if (compSummary) {
    await prisma.competencySnapshot.create({
      data: {
        userId: params.userId,
        sessionId: params.sessionId,
        competency: params.focusCompetency,
        theta: compSummary.theta,
        se: compSummary.standard_error,
        levelEst: compSummary.level_estimate,
        percentile: compSummary.percentile,
      },
    });
  }

  const progress = await prisma.competencyProgress.update({
    where: {
      planId_competency: {
        planId: params.planId,
        competency: params.focusCompetency,
      },
    },
    data: {
      status: "COMPLETED",
      latestTheta: compSummary?.theta,
      levelEst: compSummary?.level_estimate,
      percentile: compSummary?.percentile,
      lastSessionId: params.sessionId,
      completedAt: new Date(),
    },
  });

  const feedbackData = await generateCompetencyFeedback({
    competency: params.focusCompetency,
    summary: compSummary,
    responses: session.responses.map((r) => ({
      question: r.question.template,
      answer: r.correctedTranscript ?? r.transcript,
      score: r.rubricScore,
    })),
    companyName: params.companyName,
    jobRole: params.jobRole,
  });

  await prisma.competencyFeedback.create({
    data: {
      progressId: progress.id,
      sessionId: params.sessionId,
      summary: feedbackData.summary,
      strengths: feedbackData.strengths,
      improvements: feedbackData.improvements,
      dimensions: feedbackData.dimensions,
      suggestions: feedbackData.suggestions,
      highlights: feedbackData.highlights,
      rewriteExample: feedbackData.rewriteExample,
    },
  });

  await syncCompetencyProgress({
    candidateId: params.userId,
    planId: params.planId,
    competency: params.focusCompetency,
    status: "COMPLETED",
    theta: compSummary?.theta,
    levelEst: compSummary?.level_estimate,
    percentile: compSummary?.percentile,
  });

  await markPlanCompleteIfNeeded(params.planId);

  return `/interview/plan/${params.planId}/competency/${params.focusCompetency}/feedback?sessionId=${params.sessionId}`;
}

async function finalizeFullSession(
  sessionId: string,
  states: Record<string, CompetencyState>
) {
  const summary = await getIrtSessionSummary({ sessionId, competencyStates: states });

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      user: true,
      responses: { include: { question: true } },
      targetCompany: true,
    },
  });

  if (!session) return;

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      overallTheta: summary.overall_theta,
    },
  });

  for (const comp of summary.competencies) {
    await prisma.competencySnapshot.create({
      data: {
        userId: session.userId,
        sessionId,
        competency: comp.competency,
        theta: comp.theta,
        se: comp.standard_error,
        levelEst: comp.level_estimate,
        percentile: comp.percentile,
      },
    });
  }

  const { generateSessionReport } = await import("@/lib/claude/report");
  const reportData = await generateSessionReport({
    companyName: session.targetCompany?.name,
    jobRole: session.jobRole,
    competencies: summary.competencies,
    responses: session.responses.map((r) => ({
      question: r.question.template,
      answer: r.correctedTranscript ?? r.transcript,
      score: r.rubricScore,
      competency: r.competency,
    })),
  });

  await prisma.sessionReport.create({
    data: {
      sessionId,
      summaryHtml: `<div>${reportData.summary}</div>`,
      summaryJson: reportData as unknown as Prisma.InputJsonValue,
    },
  });
}

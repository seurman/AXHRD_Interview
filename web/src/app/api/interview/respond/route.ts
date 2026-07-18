import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { submitIrtResponse, getIrtSessionSummary } from "@/lib/irt-client";
import { correctAndEvaluateAnswer, type CorrectedRubricResult } from "@/lib/gemini/evaluate";
import { parseIrtState, serializeIrtState, type StoredIrtState } from "@/lib/irt-state";
import { shouldTriggerFollowUp, pickFollowUpQuestion, acceptGroundedSuggestedFollowUp } from "@/lib/interview/follow-up";
import { buildPersonalizedQuestion, parseInterviewStyle, parseResumeSummary } from "@/lib/interview/build-question";
import { buildQuestionRationale } from "@/lib/interview/rationale";
import { pressureTierFromLevel, pressureTierLabel } from "@/lib/interview/persona";
import { generateCompetencyFeedback } from "@/lib/claude/competency-feedback";
import {
  markPlanCompleteIfNeeded,
  syncCompetencyProgress,
} from "@/lib/candidate/service";
import { resolveInterviewActorFromRequest } from "@/lib/auth/interview-access";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildAnswerKeyPointFeedback } from "@/lib/interview/feedback-helpers";
import {
  mapResponseForReport,
  mapResponsesForCompetencyFeedback,
} from "@/lib/interview/report-response";
import { generateTripleFeedback } from "@/lib/interview/triple-feedback";
import { getOrgKitCustomRubric, filterQuestionsByOrgKit } from "@/lib/org/interview-kit";
import {
  appendUserTextRecord,
  formatInterviewAnswerText,
} from "@/lib/user-text-archive";
import { poolQuestionsToItemParams, prepareRankedQuestionPool } from "@/lib/interview/question-pool";
import {
  BONUS_QUESTION_ID,
  CLAIM_QUESTION_ID,
  DEFAULT_QUESTION_COUNT,
  FULL_SESSION_MAX_ITEMS,
  FULL_SESSION_MIN_ITEMS,
  sessionItemLimits,
} from "@/lib/interview/session-limits";
import {
  buildRoundBriefFromFeedbacks,
  filterQueueByProgress,
  isValidPrepMode,
  parseCompetencyQueue,
} from "@/lib/interview/competency-round";
import { generateJdBonusQuestion } from "@/lib/interview/jd-bonus-question";
import { generateResumeClaimQuestion } from "@/lib/interview/resume-claim-question";
import {
  evaluateClaimVerification,
  CLAIM_LABEL_DISPLAY,
} from "@/lib/interview/claim-verification";
import { parseJdRequirements } from "@/lib/company/jd-mapper";
import {
  averageDimensions,
  normalizeAnswerDimensions,
  normalizeCompetencyDimensions,
  type AnswerDimensions,
} from "@/lib/interview/answer-dimensions";
import type { CompetencyState, ItemParams, InterviewQuestion } from "@/types";

/** Pro 채점·트리플 피드백 여유 */
export const maxDuration = 90;

type SessionWithRelations = Prisma.InterviewSessionGetPayload<{
  include: { resume: true; targetCompany: true; responses: true; plan: true };
}>;

async function buildItemPoolForSession(
  session: SessionWithRelations,
  focusCompetency: string,
): Promise<ItemParams[]> {
  const questions = await prisma.question.findMany({
    where: { isActive: true, competency: { code: focusCompetency, isActive: true } },
    include: { competency: true },
  });

  const kitFiltered = await filterQuestionsByOrgKit({
    organizationId: session.kitOrganizationId,
    competency: focusCompetency,
    questions,
  });

  const ranked = await prepareRankedQuestionPool({
    userId: session.userId,
    competency: focusCompetency,
    questions: kitFiltered,
    resumeSummary: parseResumeSummary(session.resume?.parsedTags),
    jobRole: session.jobRole,
    interviewStyleFocus: parseInterviewStyle(session.targetCompany?.interviewStyle)?.focus,
  });

  return poolQuestionsToItemParams(ranked);
}

function competencySessionLimits(stored: StoredIrtState) {
  return sessionItemLimits(stored.questionCount ?? DEFAULT_QUESTION_COUNT);
}

export async function POST(req: Request) {
  try {
    const body = await req.clone().json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId가 필요합니다." }, { status: 400 });
    }

    const actor = await resolveInterviewActorFromRequest(req, sessionId);
    if (!actor) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", redirect: "/auth/login" },
        { status: 401 },
      );
    }

    const rlKey = actor.isPresenter ? `presenter:${sessionId}` : actor.userId;
    const rl = checkRateLimit(`interview:respond:${rlKey}`, 40, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    return await handleRespond(req, actor.userId);
  } catch (e) {
    console.error("[interview/respond]", e);
    const message = e instanceof Error ? e.message : "답변 처리 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleRespond(req: Request, userId: string) {
  const body = await req.json();
  const { sessionId, questionId, transcript, durationSec, pasteDetected, tabSwitchCount } = body;

  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return NextResponse.json(
      { error: "답변 내용이 비어 있습니다. 음성 인식 후 제출하거나 직접 입력해 주세요." },
      { status: 400 }
    );
  }

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

  const stored = parseIrtState(session.irtState);

  if (questionId === BONUS_QUESTION_ID) {
    return handleBonusRespond({
      session,
      stored,
      transcript,
      durationSec,
      userId,
    });
  }

  if (questionId === CLAIM_QUESTION_ID) {
    return handleClaimVerificationRespond({
      session,
      stored,
      transcript,
      durationSec,
      userId,
    });
  }

  if (pasteDetected === true || (typeof tabSwitchCount === "number" && tabSwitchCount > 0)) {
    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        pasteDetected: session.pasteDetected || pasteDetected === true,
        tabSwitchCount:
          typeof tabSwitchCount === "number"
            ? Math.max(session.tabSwitchCount, tabSwitchCount)
            : session.tabSwitchCount,
      },
    });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { competency: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const displayedQuestion =
    stored.personalizedQuestions?.[question.externalId]?.text ?? question.template;
  const rubricCriteria = stored.personalizedQuestions?.[question.externalId]?.rubric;

  // 자소서 원문을 채점 프롬프트에 그대로 넣지 않고 정리된 요약을 우선 사용한다(오탈자·
  // 인적사항 등 원문 노이즈가 일관성 체크에 잘못 반영되는 걸 막기 위함). 요약이 아직
  // 없는 레거시 자소서만 원문(500자 이내)으로 폴백한다.
  const resumeSummary = parseResumeSummary(session.resume?.parsedTags);
  const resumeContext = resumeSummary
    ? [resumeSummary.summary, ...resumeSummary.experiences].filter(Boolean).join(" ")
    : session.resume?.rawText;

  const focusCompetency =
    session.focusCompetency ?? question.competency.code;
  const isCompetencyMode = session.mode === "COMPETENCY";
  const itemLimits = isCompetencyMode
    ? competencySessionLimits(stored)
    : { minItems: FULL_SESSION_MIN_ITEMS, maxItems: FULL_SESSION_MAX_ITEMS, questionCount: FULL_SESSION_MAX_ITEMS };
  const maxItemsPerCompetency = itemLimits.maxItems;

  // 압박 강도 적응형 조절 — 이 문항이 출제된 시점의 추정 레벨을 그대로 면접관 톤에
  // 재사용한다(이번 턴에 대한 꼬리질문 판단/문구에 적용, 채점 자체에는 영향 없음).
  const currentTier = pressureTierFromLevel(
    stored.competencies[question.competency.code]?.current_level ?? 2
  );

  // 꼬리질문은 세션당 최대 1회 — administeredIds와 무관하게 followUpUsed로 제어한다.

  // 진행 중인 꼬리질문에 대한 답변인지 확인 — 서버 상태(irtState.pendingFollowUp)가
  // 기준이며 클라이언트는 별도 플래그를 보낼 필요가 없다.
  const pending = stored.pendingFollowUp;
  const isFollowUpAnswer = !!pending && pending.questionId === questionId;

  // Web Speech API STT 오인식(예: "병목"→"병 먹고") 교정 + 채점을 한 번의 Gemini 호출로
  // 합쳐서 처리한다(왕복 1회 절감) — 원문(transcript)은 그대로 DB에 남기고 채점·이후
  // 인용에는 교정본을 쓴다.
  let rubric: CorrectedRubricResult;
  let correctedAnswer: string;
  let finalTranscript: string;
  let finalCorrectedTranscript: string | null;
  let finalDurationSec: number | null;

  if (isFollowUpAnswer && pending) {
    // 꼬리질문 답변 — 원 답변 맥락과 함께 이번 답변만 교정하고, 둘을 종합해 최종 평가한다.
    const combinedQuestion = `${displayedQuestion}

[최초 답변] ${pending.originalCorrectedTranscript ?? pending.originalTranscript}

[꼬리질문] ${pending.followUpQuestion}
(아래 "원문 답변"은 이 꼬리질문에 대한 후속 답변입니다 — 위 최초 답변과 함께 종합적으로 평가하세요.)`;

    const combined = await correctAndEvaluateAnswer({
      question: combinedQuestion,
      rawAnswer: transcript,
      competency: question.competency.code,
      resumeContext,
      rubricCriteria,
      pressureTier: currentTier,
    });

    rubric = combined;
    correctedAnswer = combined.correctedAnswer;
    finalTranscript = pending.originalTranscript;
    finalCorrectedTranscript = pending.originalCorrectedTranscript;
    finalDurationSec = pending.originalDurationSec;
  } else {
    const combined = await correctAndEvaluateAnswer({
      question: displayedQuestion,
      rawAnswer: transcript,
      competency: question.competency.code,
      resumeContext,
      rubricCriteria,
      pressureTier: currentTier,
    });

    rubric = combined;
    correctedAnswer = combined.correctedAnswer;

    if (shouldTriggerFollowUp(rubric, currentTier) && !stored.followUpUsed) {
      // LLM 제안은 답변에 실제 등장한 구절을 인용할 때만 채택. 아니면 발화 인용 템플릿.
      const groundedLlm = acceptGroundedSuggestedFollowUp(
        rubric.suggestedFollowUp,
        correctedAnswer
      );
      const followUpQuestion =
        groundedLlm ?? pickFollowUpQuestion(question.followUpHints, correctedAnswer, currentTier);

      const updatedState: StoredIrtState = {
        ...stored,
        followUpUsed: true,
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
        answerFeedback: {
          ...buildAnswerKeyPointFeedback({
            answer: correctedAnswer,
            briefFeedback: rubric.briefFeedback,
            dimensions: rubric.dimensions,
            level: question.level,
            competency: question.competency.code,
            isInterim: true,
            score: rubric.score,
          }),
          score: rubric.score,
          level: question.level,
          competency: question.competency.code,
          isInterim: true,
        },
        nextQuestion: {
          id: question.id,
          externalId: question.externalId,
          competency: question.competency.code,
          level: question.level,
          text: question.template,
          personalizedText: followUpQuestion,
          rationale:
            "방금 하신 말씀 중 한 구절을 근거로, 세션당 한 번만 이어지는 구체화 질문입니다.",
          isFollowUp: true,
          pressureTier: currentTier,
          personaLabel: pressureTierLabel(currentTier),
          resumePersonalized: false,
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

  const itemPool: ItemParams[] = isCompetencyMode
    ? await buildItemPoolForSession(session, focusCompetency)
    : questions.map((q) => ({
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
        .filter((r) => !r.isBonusQuestion && !r.isClaimVerification)
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
    minItems: itemLimits.minItems,
    maxItems: itemLimits.maxItems,
  });

  const chipTypeMap: Record<string, "PASS" | "ATTEMPT" | "DOWNGRADE"> = {
    pass: "PASS",
    attempt: "ATTEMPT",
    downgrade: "DOWNGRADE",
  };

  // 자소서 일관성 체크(순화된 버전) — 채점(rubric.score)에는 영향을 주지 않고, 명백한
  // 모순이 있을 때만 부드러운 코칭 톤 한 줄을 기존 피드백 뒤에 덧붙인다.
  const briefFeedbackWithConsistency = [
    rubric.briefFeedback || irtResult.chip_event.brief_feedback,
    rubric.consistencyNote,
  ]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(" ");

  const updatedAdministered = [...administeredIds, question.externalId];
  const planId = stored.planId ?? session.planId ?? undefined;

  let tripleFeedbackJson: Prisma.InputJsonValue | undefined;
  if (session.tripleFeedbackMode) {
    const triple = await generateTripleFeedback({
      question: displayedQuestion,
      answer: correctedAnswer,
      competency: question.competency.code,
    });
    tripleFeedbackJson = triple as unknown as Prisma.InputJsonValue;
  }

  const updatedState: StoredIrtState = {
    ...stored,
    competencies: irtResult.competency_states,
    nextItemId: irtResult.next_item?.item_id,
    administeredIds: updatedAdministered,
    focusCompetency,
    planId,
    personalizedQuestions: stored.personalizedQuestions,
    usedHighlights: stored.usedHighlights,
    usedJdTerms: stored.usedJdTerms,
    followUpUsed: stored.followUpUsed || isFollowUpAnswer,
  };

  // 응답 기록(ResponseRecord/ChipEvent)은 다음 질문 준비(세션 상태 저장 → 개인화)와
  // 서로 의존 관계가 없으므로 병렬로 처리해 왕복 대기 시간을 겹쳐 줄인다. 단, 세션
  // irtState에 대한 두 번의 쓰기(아래 명시적 업데이트 → buildPersonalizedQuestion 내부
  // 업데이트)는 순서가 바뀌면 방금 캐시한 개인화 질문이 덮어써질 수 있어 순서를 유지한다.
  const [, nextQuestion] = await Promise.all([
    Promise.all([
      prisma.responseRecord.create({
        data: {
          sessionId,
          questionId,
          competency: question.competency.code,
          level: question.level,
          transcript: finalTranscript,
          correctedTranscript: finalCorrectedTranscript,
          dimensions: rubric.dimensions as unknown as Prisma.InputJsonValue,
          rubricScore: rubric.score,
          durationSec: finalDurationSec,
          initialRubricScore: isFollowUpAnswer && pending ? pending.originalScore : null,
          followUpQuestion: isFollowUpAnswer && pending ? pending.followUpQuestion : null,
          followUpTranscript: isFollowUpAnswer ? transcript : null,
          followUpCorrectedTranscript:
            isFollowUpAnswer && correctedAnswer !== transcript ? correctedAnswer : null,
        },
      }),
      prisma.chipEvent.create({
        data: {
          sessionId,
          competency: irtResult.chip_event.competency,
          level: irtResult.chip_event.level,
          chipType: chipTypeMap[irtResult.chip_event.chip_type],
          rubricScore: irtResult.chip_event.rubric_score,
          briefFeedback: briefFeedbackWithConsistency,
          hadFollowUp: isFollowUpAnswer,
          tripleFeedback: tripleFeedbackJson,
          sequence: session.responses.length,
        },
      }),
      appendUserTextRecord({
        userId,
        kind: isFollowUpAnswer ? "INTERVIEW_FOLLOW_UP" : "INTERVIEW_ANSWER",
        content: formatInterviewAnswerText({
          competency: question.competency.code,
          level: question.level,
          question: displayedQuestion,
          answer: isFollowUpAnswer && pending ? pending.originalTranscript ?? finalTranscript : finalTranscript,
          followUpQuestion: isFollowUpAnswer && pending ? pending.followUpQuestion : null,
          followUpAnswer: isFollowUpAnswer ? transcript : null,
        }),
        sourceType: "interview_session",
        sourceId: sessionId,
      }),
    ]),
    (async () => {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          irtState: serializeIrtState(updatedState),
        },
      });

      if (!irtResult.next_item) return null;

      const next = await prisma.question.findUnique({
        where: { externalId: irtResult.next_item.item_id },
        include: { competency: true },
      });
      if (!next) return null;

      const rationale = buildQuestionRationale({
        level: irtResult.next_item.target_level,
        expectedInformation: irtResult.next_item.expected_information,
      });
      // 다음 문항의 압박 강도는 이번 답변까지 반영된 최신 추정 레벨(irtResult.competency_states)
      // 기준으로 정한다 — 잘 버티면 다음 문항은 더 깐깐하게, 흔들리면 더 부드럽게.
      const nextTier = pressureTierFromLevel(
        irtResult.competency_states[next.competency.code]?.current_level ?? 2
      );
      // 세션 시작 시점에 적용된 기관 킷(kitOrganizationId) 기준으로 조회한다 —
      // 공유 링크로 시작한 비가입자 세션도 정확히 반영된다.
      const orgKitRubric = await getOrgKitCustomRubric(
        session.kitOrganizationId,
        next.competency.code,
        next.level
      );
      // 이 시점의 next 문항은 이미 이번 턴에 문항 하나를 답한 뒤라(updatedAdministered에
      // 최소 1개 포함) 해당 역량의 2번째 이상 문항이다 — 첫 문항만 자소서로 맞춤화한다는
      // 정책에 따라 여기서는 항상 일반 질문(Gemini 미호출)으로 처리한다.
      return buildPersonalizedQuestion(
        { ...session, irtState: serializeIrtState(updatedState) },
        next,
        rationale,
        { pressureTier: nextTier, orgKitRubric }
      );
    })(),
  ]);

  let redirectUrl: string | null = null;
  let nextCompetency: string | null = null;
  let shouldTerminate = irtResult.should_terminate;
  let bonusNextQuestion: InterviewQuestion | null = null;

  if (irtResult.should_terminate) {
    const bonusOffer = await tryOfferBonusQuestion({
      session,
      stored: updatedState,
      focusCompetency,
      competencyStates: irtResult.competency_states,
    });
    if (bonusOffer) {
      shouldTerminate = false;
      bonusNextQuestion = bonusOffer;
    } else {
      const claimOffer = await tryOfferClaimQuestion({
        session,
        stored: updatedState,
        focusCompetency,
        competencyStates: irtResult.competency_states,
      });
      if (claimOffer) {
        shouldTerminate = false;
        bonusNextQuestion = claimOffer;
      }
    }
  }

  if (shouldTerminate) {
    if (isCompetencyMode && planId && focusCompetency) {
      redirectUrl = await finalizeCompetencySession({
        sessionId,
        planId,
        focusCompetency,
        states: irtResult.competency_states,
        userId: session.userId,
        companyName: session.targetCompany?.name,
        jobRole: session.jobRole,
        persona: session.targetCompany?.persona as
          | { name: string; description: string }
          | null
          | undefined,
      });
    } else {
      await finalizeFullSession(sessionId, irtResult.competency_states);
      redirectUrl = `/interview/${sessionId}/report`;
    }
  }

  if (planId && redirectUrl?.includes("/feedback")) {
    nextCompetency = await resolveNextQueuedCompetency(planId);
  }

  return NextResponse.json({
    competencyStates: irtResult.competency_states,
    chipEvent: {
      ...irtResult.chip_event,
      had_follow_up: isFollowUpAnswer,
      brief_feedback: briefFeedbackWithConsistency,
    },
    answerFeedback: {
      ...buildAnswerKeyPointFeedback({
        answer: correctedAnswer,
        briefFeedback: briefFeedbackWithConsistency,
        dimensions: rubric.dimensions,
        chipType: irtResult.chip_event.chip_type,
        level: irtResult.chip_event.level,
        nextLevel: nextQuestion?.level,
        competency: irtResult.chip_event.competency,
        score: rubric.score,
      }),
      score: rubric.score,
      chipType: irtResult.chip_event.chip_type,
      level: irtResult.chip_event.level,
      competency: irtResult.chip_event.competency,
      isInterim: false,
      ...(tripleFeedbackJson ? { tripleFeedback: tripleFeedbackJson } : {}),
    },
    nextQuestion: bonusNextQuestion ?? nextQuestion,
    shouldTerminate,
    totalItems: irtResult.total_items,
    administeredIds: updatedAdministered,
    redirectUrl,
    planId,
    focusCompetency,
    nextCompetency,
    maxItemsPerCompetency: isCompetencyMode
      ? competencySessionLimits(stored).maxItems
      : FULL_SESSION_MAX_ITEMS,
  });
}

function buildBonusInterviewQuestion(
  bonus: { question: string; groundedRequirement: string },
  competency: string
): InterviewQuestion {
  return {
    id: BONUS_QUESTION_ID,
    externalId: BONUS_QUESTION_ID,
    competency,
    level: 0,
    text: bonus.question,
    personalizedText: bonus.question,
    rationale: `채용공고 요구사항 「${bonus.groundedRequirement}」을 바탕으로 한 참고용 보너스 질문입니다. 점수에는 반영되지 않습니다.`,
    isBonusQuestion: true,
    resumePersonalized: false,
  };
}

async function tryOfferBonusQuestion(params: {
  session: SessionWithRelations;
  stored: StoredIrtState;
  focusCompetency: string;
  competencyStates: Record<string, CompetencyState>;
}): Promise<InterviewQuestion | null> {
  if (!params.session.jdBonusEnabled || params.stored.bonusQuestionOffered) return null;

  const jdReq = parseJdRequirements(params.session.targetCompany?.jdRequirements);
  if (!jdReq) return null;

  const bonus =
    params.stored.pendingBonusQuestion ??
    (await generateJdBonusQuestion({
      jdRequirements: jdReq,
      competency: params.focusCompetency,
    }));

  if (!bonus) return null;

  const nextState: StoredIrtState = {
    ...params.stored,
    competencies: params.competencyStates,
    pendingBonusQuestion: bonus,
    nextItemId: BONUS_QUESTION_ID,
    bonusQuestionOffered: true,
  };

  await prisma.interviewSession.update({
    where: { id: params.session.id },
    data: { irtState: serializeIrtState(nextState) },
  });

  return buildBonusInterviewQuestion(bonus, params.focusCompetency);
}

function buildClaimInterviewQuestion(
  claim: { question: string; groundedClaim: string },
  competency: string,
): InterviewQuestion {
  return {
    id: CLAIM_QUESTION_ID,
    externalId: CLAIM_QUESTION_ID,
    competency,
    level: 0,
    text: claim.question,
    personalizedText: claim.question,
    rationale:
      "자소서에 적힌 내용을 조금 더 구체적으로 확인하는 참고용 질문입니다. 점수에는 반영되지 않습니다.",
    isBonusQuestion: true,
    isClaimVerification: true,
    resumePersonalized: true,
  };
}

async function tryOfferClaimQuestion(params: {
  session: SessionWithRelations;
  stored: StoredIrtState;
  focusCompetency: string;
  competencyStates: Record<string, CompetencyState>;
}): Promise<InterviewQuestion | null> {
  if (!params.session.resumeClaimEnabled || params.stored.claimQuestionOffered) return null;

  const resumeSummary = parseResumeSummary(params.session.resume?.parsedTags);
  if (!resumeSummary || resumeSummary.experiences.length === 0) return null;

  let preferredExperiences: string[] | undefined;
  let performanceBand: string | undefined;
  try {
    const { resolveEvidenceForCompetency } = await import("@/lib/interview/resume-ontology");
    const { performanceBand: bandOf } = await import("@/lib/interview/resume-evidence");
    const resolved = await resolveEvidenceForCompetency({
      userId: params.session.userId,
      resumeId: params.session.resumeId,
      summary: resumeSummary,
      competency: params.focusCompetency,
    });
    if (resolved.experiences.length) preferredExperiences = resolved.experiences;
    performanceBand = bandOf(resolved.performance);
  } catch {
    /* Postgres evidence만 사용 */
  }

  const claim =
    params.stored.pendingClaimQuestion ??
    (await generateResumeClaimQuestion({
      experiences: resumeSummary.experiences,
      preferredExperiences,
      performanceBand,
      competency: params.focusCompetency,
    }));

  if (!claim) return null;

  const nextState: StoredIrtState = {
    ...params.stored,
    competencies: params.competencyStates,
    pendingClaimQuestion: claim,
    nextItemId: CLAIM_QUESTION_ID,
    claimQuestionOffered: true,
  };

  await prisma.interviewSession.update({
    where: { id: params.session.id },
    data: { irtState: serializeIrtState(nextState) },
  });

  return buildClaimInterviewQuestion(claim, params.focusCompetency);
}

async function handleClaimVerificationRespond(params: {
  session: SessionWithRelations;
  stored: StoredIrtState;
  transcript: string;
  durationSec?: number;
  userId: string;
}) {
  const { session, stored, transcript, durationSec, userId } = params;
  const pending = stored.pendingClaimQuestion;
  if (!pending) {
    return NextResponse.json({ error: "확인 질문이 없습니다." }, { status: 400 });
  }

  const focusCompetency = session.focusCompetency ?? "JOB_FIT";
  const result = await evaluateClaimVerification({
    claim: pending.groundedClaim,
    question: pending.question,
    answer: transcript,
  });

  const finalDurationSec = typeof durationSec === "number" ? Math.round(durationSec) : null;

  await prisma.responseRecord.create({
    data: {
      sessionId: session.id,
      questionId: null,
      isClaimVerification: true,
      claimVerificationClaim: pending.groundedClaim,
      claimVerificationLabel: result.label,
      claimVerificationReasoning: result.reasoning,
      competency: focusCompetency,
      level: 0,
      transcript,
      correctedTranscript: null,
      rubricScore: 0.5,
      durationSec: finalDurationSec,
    },
  });

  void appendUserTextRecord({
    userId,
    kind: "INTERVIEW_ANSWER",
    content: formatInterviewAnswerText({
      competency: focusCompetency,
      level: 0,
      question: pending.question,
      answer: transcript,
    }),
    sourceType: "interview_session",
    sourceId: session.id,
  });

  const clearedState: StoredIrtState = {
    ...stored,
    pendingClaimQuestion: undefined,
    nextItemId: undefined,
  };
  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { irtState: serializeIrtState(clearedState) },
  });

  const planId = stored.planId ?? session.planId ?? undefined;
  let redirectUrl: string | null = null;
  let nextCompetency: string | null = null;

  if (session.mode === "COMPETENCY" && planId && focusCompetency) {
    redirectUrl = await finalizeCompetencySession({
      sessionId: session.id,
      planId,
      focusCompetency,
      states: stored.competencies,
      userId: session.userId,
      companyName: session.targetCompany?.name,
      jobRole: session.jobRole,
      persona: session.targetCompany?.persona as
        | { name: string; description: string }
        | null
        | undefined,
    });
  } else {
    await finalizeFullSession(session.id, stored.competencies);
    redirectUrl = `/interview/${session.id}/report`;
  }

  if (planId && redirectUrl?.includes("/feedback")) {
    nextCompetency = await resolveNextQueuedCompetency(planId);
  }

  return NextResponse.json({
    competencyStates: stored.competencies,
    chipEvent: null,
    answerFeedback: {
      claimVerification: {
        label: result.label,
        displayLabel: CLAIM_LABEL_DISPLAY[result.label],
        reasoning: result.reasoning,
      },
      isInterim: false,
    },
    nextQuestion: null,
    shouldTerminate: true,
    totalItems: stored.administeredIds.length,
    administeredIds: stored.administeredIds,
    redirectUrl,
    planId,
    focusCompetency,
    nextCompetency,
    maxItemsPerCompetency: competencySessionLimits(stored).maxItems,
  });
}

async function handleBonusRespond(params: {
  session: SessionWithRelations;
  stored: StoredIrtState;
  transcript: string;
  durationSec?: number;
  userId: string;
}) {
  const { session, stored, transcript, durationSec, userId } = params;
  const pending = stored.pendingBonusQuestion;
  if (!pending) {
    return NextResponse.json({ error: "보너스 질문이 없습니다." }, { status: 400 });
  }

  const focusCompetency = session.focusCompetency ?? "JOB_FIT";
  const resumeSummary = parseResumeSummary(session.resume?.parsedTags);
  const resumeContext = resumeSummary
    ? [resumeSummary.summary, ...resumeSummary.experiences].filter(Boolean).join(" ")
    : session.resume?.rawText;

  const rubric = await correctAndEvaluateAnswer({
    question: pending.question,
    rawAnswer: transcript,
    competency: focusCompetency,
    resumeContext,
    rubricCriteria: undefined,
    pressureTier: "NEUTRAL",
  });

  const correctedAnswer = rubric.correctedAnswer;
  const finalDurationSec = typeof durationSec === "number" ? Math.round(durationSec) : null;

  await prisma.responseRecord.create({
    data: {
      sessionId: session.id,
      questionId: null,
      isBonusQuestion: true,
      bonusQuestionText: pending.question,
      bonusGroundedRequirement: pending.groundedRequirement,
      bonusBriefFeedback: rubric.briefFeedback,
      competency: focusCompetency,
      level: 0,
      transcript,
      correctedTranscript: correctedAnswer !== transcript ? correctedAnswer : null,
      dimensions: rubric.dimensions as unknown as Prisma.InputJsonValue,
      rubricScore: rubric.score,
      durationSec: finalDurationSec,
    },
  });

  void appendUserTextRecord({
    userId,
    kind: "INTERVIEW_ANSWER",
    content: formatInterviewAnswerText({
      competency: focusCompetency,
      level: 0,
      question: pending.question,
      answer: correctedAnswer,
    }),
    sourceType: "interview_session",
    sourceId: session.id,
  });

  const clearedState: StoredIrtState = {
    ...stored,
    pendingBonusQuestion: undefined,
    nextItemId: undefined,
  };
  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { irtState: serializeIrtState(clearedState) },
  });

  const claimOffer = await tryOfferClaimQuestion({
    session,
    stored: clearedState,
    focusCompetency,
    competencyStates: stored.competencies,
  });
  if (claimOffer) {
    return NextResponse.json({
      competencyStates: stored.competencies,
      chipEvent: null,
      answerFeedback: {
        ...buildAnswerKeyPointFeedback({
          answer: correctedAnswer,
          briefFeedback: rubric.briefFeedback,
          dimensions: rubric.dimensions,
          level: 0,
          competency: focusCompetency,
          score: rubric.score,
        }),
        score: rubric.score,
        level: 0,
        competency: focusCompetency,
        isInterim: false,
      },
      nextQuestion: claimOffer,
      shouldTerminate: false,
      totalItems: stored.administeredIds.length,
      administeredIds: stored.administeredIds,
      redirectUrl: null,
      planId: stored.planId ?? session.planId ?? undefined,
      focusCompetency,
      nextCompetency: null,
      maxItemsPerCompetency: competencySessionLimits(stored).maxItems,
    });
  }

  const planId = stored.planId ?? session.planId ?? undefined;
  let redirectUrl: string | null = null;
  let nextCompetency: string | null = null;

  if (session.mode === "COMPETENCY" && planId && focusCompetency) {
    redirectUrl = await finalizeCompetencySession({
      sessionId: session.id,
      planId,
      focusCompetency,
      states: stored.competencies,
      userId: session.userId,
      companyName: session.targetCompany?.name,
      jobRole: session.jobRole,
      persona: session.targetCompany?.persona as
        | { name: string; description: string }
        | null
        | undefined,
    });
  } else {
    await finalizeFullSession(session.id, stored.competencies);
    redirectUrl = `/interview/${session.id}/report`;
  }

  if (planId && redirectUrl?.includes("/feedback")) {
    nextCompetency = await resolveNextQueuedCompetency(planId);
  }

  return NextResponse.json({
    competencyStates: stored.competencies,
    chipEvent: null,
    answerFeedback: {
      ...buildAnswerKeyPointFeedback({
        answer: correctedAnswer,
        briefFeedback: rubric.briefFeedback,
        dimensions: rubric.dimensions,
        level: 0,
        competency: focusCompetency,
        score: rubric.score,
      }),
      score: rubric.score,
      level: 0,
      competency: focusCompetency,
      isInterim: false,
    },
    nextQuestion: null,
    shouldTerminate: true,
    totalItems: stored.administeredIds.length,
    administeredIds: stored.administeredIds,
    redirectUrl,
    planId,
    focusCompetency,
    nextCompetency,
    maxItemsPerCompetency: competencySessionLimits(stored).maxItems,
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
  persona?: { name: string; description: string } | null;
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

  const regularResponses = session.responses.filter(
    (r) => !r.isBonusQuestion && !r.isClaimVerification && r.question,
  );
  const feedbackData = await generateCompetencyFeedback({
    competency: params.focusCompetency,
    summary: compSummary,
    responses: mapResponsesForCompetencyFeedback(regularResponses),
    companyName: params.companyName,
    jobRole: params.jobRole,
    persona: params.persona ?? undefined,
  });

  const perTurnDimensions = regularResponses
    .map((r) => normalizeAnswerDimensions(r.dimensions))
    .filter((d): d is AnswerDimensions => d !== null);

  const measuredDimensions =
    perTurnDimensions.length > 0
      ? normalizeCompetencyDimensions(averageDimensions(perTurnDimensions)!)
      : null;

  await prisma.competencyFeedback.create({
    data: {
      progressId: progress.id,
      sessionId: params.sessionId,
      summary: feedbackData.summary,
      strengths: feedbackData.strengths,
      improvements: feedbackData.improvements,
      dimensions: (measuredDimensions ?? feedbackData.dimensions) as unknown as Prisma.InputJsonValue,
      suggestions: feedbackData.suggestions,
      highlights: feedbackData.highlights,
      rewriteExample: feedbackData.rewriteExample,
      personaAlignmentNote: feedbackData.personaAlignmentNote,
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

  try {
    const { ensureResumeEvidence } = await import("@/lib/interview/resume-evidence");
    const { pickClaimIdsUsedInSession } = await import("@/lib/interview/resume-ontology");
    const { syncClaimDemonstration } = await import("@/lib/neo4j/resume-evidence-graph");
    const { parseIrtState } = await import("@/lib/irt-state");
    const sessionWithResume = await prisma.interviewSession.findUnique({
      where: { id: params.sessionId },
      include: { resume: true },
    });
    const storedIrt = parseIrtState(sessionWithResume?.irtState);
    const summary = sessionWithResume?.resume?.parsedTags
      ? ensureResumeEvidence(
          (await import("@/lib/interview/build-question")).parseResumeSummary(
            sessionWithResume.resume.parsedTags,
          ) ?? { summary: "", skills: [], experiences: [], keywords: [], chunks: [] },
        )
      : null;
    const claimIds = pickClaimIdsUsedInSession({
      highlights: storedIrt.usedHighlights ?? [],
      evidence: summary?.evidence,
      claimVerificationClaim: storedIrt.pendingClaimQuestion?.groundedClaim ?? null,
    });
    const rubricScores = regularResponses
      .map((r) => r.rubricScore)
      .filter((n): n is number => typeof n === "number");
    const rubricAvg =
      rubricScores.length > 0
        ? rubricScores.reduce((a, b) => a + b, 0) / rubricScores.length
        : null;
    await syncClaimDemonstration({
      userId: params.userId,
      resumeId: sessionWithResume?.resumeId,
      competency: params.focusCompetency,
      claimIds,
      sessionId: params.sessionId,
      theta: compSummary?.theta,
      levelEst: compSummary?.level_estimate,
      percentile: compSummary?.percentile,
      rubricAvg,
    });
  } catch (e) {
    console.warn("[finalize] claim demonstration sync failed:", e);
  }

  await markPlanCompleteIfNeeded(params.planId);

  const plan = await prisma.interviewPlan.findUnique({
    where: { id: params.planId },
    include: { competencyProgress: true },
  });

  if (plan) {
    const roundCodes = parseCompetencyQueue(plan.roundCompetencyCodes);
    const remainingQueue = filterQueueByProgress(
      parseCompetencyQueue(plan.queuedCompetencyCodes),
      plan.competencyProgress,
    ).filter((c) => c !== params.focusCompetency);

    await prisma.interviewPlan.update({
      where: { id: params.planId },
      data: { queuedCompetencyCodes: remainingQueue },
    });

    if (roundCodes.length > 0) {
      const roundDone = roundCodes.every((code) => {
        const row = plan.competencyProgress.find((p) => p.competency === code);
        return row?.status === "COMPLETED" || code === params.focusCompetency;
      });

      if (roundDone) {
        const feedbackRows = await prisma.competencyFeedback.findMany({
          where: {
            progress: { planId: params.planId, competency: { in: roundCodes } },
          },
          include: { progress: { select: { competency: true } } },
        });

        const roundBrief = buildRoundBriefFromFeedbacks(
          feedbackRows.map((fb) => ({
            competency: fb.progress.competency,
            strengths: fb.strengths,
            improvements: fb.improvements,
            summary: fb.summary,
          })),
          {
            competencies: roundCodes,
            timeBudgetMinutes: plan.timeBudgetMinutes,
            prepMode: isValidPrepMode(plan.prepMode) ? plan.prepMode : null,
          },
        );

        await prisma.interviewPlan.update({
          where: { id: params.planId },
          data: { roundBrief: roundBrief as unknown as Prisma.InputJsonValue },
        });
      }
    }
  }

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
  const regularResponses = session.responses.filter(
    (r) => !r.isBonusQuestion && !r.isClaimVerification && r.question,
  );
  const mappedResponses = regularResponses.map((r) => mapResponseForReport(r));
  const legacyReportPromise = generateSessionReport({
    companyName: session.targetCompany?.name,
    jobRole: session.jobRole,
    competencies: summary.competencies,
    responses: mappedResponses,
  });
  const evidenceReportPromise = import("@/lib/assessment/generate-evidence-report")
    .then(({ generateEvidenceAssessmentReport }) =>
      generateEvidenceAssessmentReport({
        companyName: session.targetCompany?.name,
        jobRole: session.jobRole,
        competencies: summary.competencies,
        responses: mappedResponses,
      }),
    )
    .catch((error) => {
      console.error("[interview evidence] 생성 실패:", error);
      return null;
    });

  const [reportData, evidenceReport] = await Promise.all([
    legacyReportPromise,
    evidenceReportPromise,
  ]);

  await prisma.sessionReport.create({
    data: {
      sessionId,
      summaryHtml: `<div>${reportData.summary}</div>`,
      summaryJson: reportData as unknown as Prisma.InputJsonValue,
    },
  });

  if (evidenceReport) {
    try {
      const { saveSessionEvidence } = await import("@/lib/assessment/persist-evidence");
      await saveSessionEvidence(sessionId, evidenceReport);
    } catch (error) {
      // 기존 리포트 완료/리다이렉트는 증거 리포트 저장 실패와 독립적으로 유지한다.
      console.error("[interview evidence] 저장 실패:", error);
    }
  }
}

async function resolveNextQueuedCompetency(planId: string): Promise<string | null> {
  const planRow = await prisma.interviewPlan.findUnique({
    where: { id: planId },
    include: { competencyProgress: true },
  });
  if (!planRow) return null;
  const queue = filterQueueByProgress(
    parseCompetencyQueue(planRow.queuedCompetencyCodes),
    planRow.competencyProgress,
  );
  return queue[0] ?? null;
}

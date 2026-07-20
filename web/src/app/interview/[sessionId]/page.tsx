import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveInterviewActor } from "@/lib/auth/interview-access";
import { InterviewSession } from "@/components/interview/InterviewSession";
import { parseIrtState, defaultCompetencyStates } from "@/lib/irt-state";
import { buildPersonalizedQuestion } from "@/lib/interview/build-question";
import {
  BONUS_QUESTION_ID,
  CLAIM_QUESTION_ID,
  DEFAULT_QUESTION_COUNT,
  FULL_SESSION_MAX_ITEMS,
  clampQuestionCount,
} from "@/lib/interview/session-limits";
import { getOrgKitCustomRubric } from "@/lib/org/interview-kit";
import { buildQuestionRationale } from "@/lib/interview/rationale";
import { pressureTierFromLevel } from "@/lib/interview/persona";
import { competencyLabel } from "@/lib/labels";
import { interviewSessionHref } from "@/lib/interview/session-href";
import type { InterviewSessionState } from "@/types";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ queue?: string }>;
}

export default async function InterviewPage({ params, searchParams }: PageProps) {
  const { sessionId } = await params;
  const { queue: queueParam } = await searchParams;
  // 설정 화면에서 역량을 여러 개 골랐을 때, 이번 세션 다음에 이어갈 나머지 역량 코드들
  // (예: "PROBLEM_SOLVING,ORG_FIT"). DB에 저장하지 않고 URL로만 들고 다닌다 — 세션이
  // 끝나면 InterviewSession이 이 값을 리포트 페이지 URL에 그대로 이어 붙인다.
  const queue = queueParam ? queueParam.split(",").filter(Boolean) : [];
  const actor = await resolveInterviewActor(sessionId);
  if (!actor) {
    redirect(`/auth/login?next=${encodeURIComponent(`/interview/${sessionId}`)}`);
  }

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      chipEvents: { orderBy: { sequence: "asc" } },
      resume: true,
      targetCompany: true,
    },
  });

  if (!session) notFound();
  if (session.userId !== actor.userId) notFound();

  const stored = parseIrtState(session.irtState);
  const questionCount = clampQuestionCount(stored.questionCount ?? DEFAULT_QUESTION_COUNT);
  const competencyStates =
    Object.keys(stored.competencies).length > 0
      ? stored.competencies
      : defaultCompetencyStates(COMPETENCY_CODES);

  let currentQuestion = null;
  const nextExternalId = stored.nextItemId;

  if (nextExternalId && session.status !== "COMPLETED") {
    if (nextExternalId === BONUS_QUESTION_ID && stored.pendingBonusQuestion) {
      const bonus = stored.pendingBonusQuestion;
      const comp = session.focusCompetency ?? "JOB_FIT";
      currentQuestion = {
        id: BONUS_QUESTION_ID,
        externalId: BONUS_QUESTION_ID,
        competency: comp,
        level: 0,
        text: bonus.question,
        personalizedText: bonus.question,
        rationale: `채용공고 요구사항 「${bonus.groundedRequirement}」 기반 참고용 보너스 질문입니다.`,
        isBonusQuestion: true,
      };
    } else if (nextExternalId === CLAIM_QUESTION_ID && stored.pendingClaimQuestion) {
      const claim = stored.pendingClaimQuestion;
      const comp = session.focusCompetency ?? "JOB_FIT";
      currentQuestion = {
        id: CLAIM_QUESTION_ID,
        externalId: CLAIM_QUESTION_ID,
        competency: comp,
        level: 0,
        text: claim.question,
        personalizedText: claim.question,
        rationale:
          "자소서에 적힌 내용을 조금 더 구체적으로 확인하는 참고용 질문입니다. 점수에는 반영되지 않습니다.",
        isBonusQuestion: true,
        isClaimVerification: true,
        resumePersonalized: true,
      };
    } else {
    const q = await prisma.question.findUnique({
      where: { externalId: nextExternalId },
      include: { competency: true },
    });
    if (q) {
      const currentLevel = stored.competencies[q.competency.code]?.current_level ?? 2;
      const orgKitRubric = await getOrgKitCustomRubric(session.kitOrganizationId, q.competency.code, q.level);
      currentQuestion = await buildPersonalizedQuestion(
        session,
        q,
        buildQuestionRationale({ level: q.level }),
        {
          pressureTier: pressureTierFromLevel(currentLevel),
          orgKitRubric,
        }
      );
    }
    }
  }

  const initialState: InterviewSessionState = {
    sessionId,
    status:
      session.status === "COMPLETED"
        ? "completed"
        : session.status === "IN_PROGRESS"
          ? "in_progress"
          : "setup",
    currentQuestion,
    competencyStates,
    chipHistory: session.chipEvents.map((e) => ({
      competency: e.competency,
      level: e.level,
      chip_type: e.chipType.toLowerCase() as "pass" | "attempt" | "downgrade",
      rubric_score: e.rubricScore,
      brief_feedback: e.briefFeedback ?? "",
    })),
    administeredIds: stored.administeredIds,
    totalItems: stored.administeredIds.length,
    shouldTerminate: false,
  };

  if (session.status === "COMPLETED") {
    const doneHref = interviewSessionHref(session);
    const withQueue =
      queue.length > 0 && doneHref.includes("/report")
        ? `${doneHref}${doneHref.includes("?") ? "&" : "?"}queue=${encodeURIComponent(queue.join(","))}`
        : doneHref;
    redirect(withQueue);
  }

  const persona = session.targetCompany?.persona as {
    name: string;
    description: string;
  } | null;

  return (
    <div className="space-y-4">
      {(persona || session.timeBudgetMinutes || questionCount) && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {persona && (
            <span
              className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
              title={persona.description}
            >
              🎭 {persona.name}
            </span>
          )}
          <span className="text-xs">
            {session.focusCompetency
              ? `${competencyLabel(session.focusCompetency)} 역량 면접`
              : `${session.sessionNumber}차 모의 면접`}
            {" · "}
            {session.timeBudgetMinutes
              ? `약 ${session.timeBudgetMinutes}분 · 역량당 ${questionCount}문항`
              : `역량당 ${questionCount}문항`}
          </span>
        </div>
      )}
      <InterviewSession
        sessionId={sessionId}
        initialState={initialState}
        focusCompetency={session.focusCompetency ?? undefined}
        maxItems={
          session.mode === "COMPETENCY" ? questionCount : FULL_SESSION_MAX_ITEMS
        }
        timeBudgetMinutes={session.timeBudgetMinutes ?? undefined}
        tripleFeedbackMode={session.tripleFeedbackMode}
        queue={queue}
        grounding={{
          companyName: session.targetCompany?.name ?? null,
          hasResume: Boolean(session.resume?.rawText?.trim()),
          resumeFileName: session.resume?.fileName ?? null,
          hasJd: Boolean(session.jdBonusEnabled || session.setupSelectionText),
        }}
      />
    </div>
  );
}

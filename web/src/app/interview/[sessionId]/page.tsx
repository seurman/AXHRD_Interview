import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveInterviewActor } from "@/lib/auth/interview-access";
import { InterviewSession } from "@/components/interview/InterviewSession";
import { parseIrtState, defaultCompetencyStates } from "@/lib/irt-state";
import { buildPersonalizedQuestion } from "@/lib/interview/build-question";
import {
  BONUS_QUESTION_ID,
  COMPETENCY_SESSION_MAX_ITEMS,
  FULL_SESSION_MAX_ITEMS,
} from "@/lib/interview/session-limits";
import { getOrgKitCustomRubric } from "@/lib/org/interview-kit";
import { buildQuestionRationale } from "@/lib/interview/rationale";
import { pressureTierFromLevel } from "@/lib/interview/persona";
import { competencyLabel } from "@/lib/labels";
import type { InterviewSessionState } from "@/types";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewPage({ params }: PageProps) {
  const { sessionId } = await params;
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
    return (
      <div className="text-center">
        <p className="text-muted">이 세션은 완료되었습니다.</p>
        <a
          href={`/interview/${sessionId}/report`}
          className="mt-4 inline-block text-primary hover:underline"
        >
          리포트 보기 →
        </a>
      </div>
    );
  }

  const persona = session.targetCompany?.persona as {
    name: string;
    description: string;
  } | null;

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-foreground">
        {session.focusCompetency
          ? `${competencyLabel(session.focusCompetency)} 역량 면접`
          : `${session.sessionNumber}차 모의 면접`}
      </h1>
      {persona && (
        <p className="mb-2">
          <span
            className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
            title={persona.description}
          >
            🎭 페르소나: {persona.name}
          </span>
        </p>
      )}
      <p className="mb-6 text-sm text-muted">역량당 3~5문항 · 자소서·공고 맞춤 · 완료 후 피드백</p>
      <InterviewSession
        sessionId={sessionId}
        initialState={initialState}
        focusCompetency={session.focusCompetency ?? undefined}
        maxItems={
          session.mode === "COMPETENCY"
            ? COMPETENCY_SESSION_MAX_ITEMS
            : FULL_SESSION_MAX_ITEMS
        }
        tripleFeedbackMode={session.tripleFeedbackMode}
      />
    </div>
  );
}

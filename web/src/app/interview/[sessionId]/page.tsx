import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePageUser, assertResourceOwner } from "@/lib/auth/guards";
import { InterviewSession } from "@/components/interview/InterviewSession";
import { parseIrtState, defaultCompetencyStates } from "@/lib/irt-state";
import { buildPersonalizedQuestion } from "@/lib/interview/build-question";
import { buildQuestionRationale } from "@/lib/interview/rationale";
import { competencyLabel } from "@/lib/labels";
import type { InterviewSessionState } from "@/types";
import { COMPETENCY_CODES } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewPage({ params }: PageProps) {
  const { sessionId } = await params;
  const user = await requirePageUser(`/interview/${sessionId}`);

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      chipEvents: { orderBy: { sequence: "asc" } },
      resume: true,
      targetCompany: true,
    },
  });

  if (!session) notFound();
  assertResourceOwner(session.userId, user.id);

  const stored = parseIrtState(session.irtState);
  const competencyStates =
    Object.keys(stored.competencies).length > 0
      ? stored.competencies
      : defaultCompetencyStates(COMPETENCY_CODES);

  let currentQuestion = null;
  const nextExternalId = stored.nextItemId;

  if (nextExternalId && session.status !== "COMPLETED") {
    const q = await prisma.question.findUnique({
      where: { externalId: nextExternalId },
      include: { competency: true },
    });
    if (q) {
      currentQuestion = await buildPersonalizedQuestion(
        session,
        q,
        buildQuestionRationale({ level: q.level })
      );
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

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-foreground">
        {session.focusCompetency
          ? `${competencyLabel(session.focusCompetency)} 역량 면접`
          : `${session.sessionNumber}차 모의 면접`}
      </h1>
      <p className="mb-6 text-sm text-muted">역량당 2~3문항 · 자소서 맞춤 · 완료 후 피드백</p>
      <InterviewSession
        sessionId={sessionId}
        initialState={initialState}
        focusCompetency={session.focusCompetency ?? undefined}
        maxItems={session.mode === "COMPETENCY" ? 3 : 18}
      />
    </div>
  );
}

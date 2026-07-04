import { prisma } from "@/lib/prisma";
import { parseIrtState, serializeIrtState } from "@/lib/irt-state";
import { personalizeQuestion } from "@/lib/interview/personalize-question";
import type { InterviewQuestion } from "@/types";

type QuestionRow = {
  id: string;
  externalId: string;
  template: string;
  level: number;
  competency: { code: string };
};

type SessionContext = {
  id: string;
  irtState: unknown;
  jobRole: string;
  resume?: { rawText: string } | null;
  targetCompany?: { name: string } | null;
};

export async function buildPersonalizedQuestion(
  session: SessionContext,
  question: QuestionRow,
  rationale?: string
): Promise<InterviewQuestion> {
  const stored = parseIrtState(session.irtState);
  const cached = stored.personalizedQuestions?.[question.externalId];

  if (cached) {
    return {
      id: question.id,
      externalId: question.externalId,
      competency: question.competency.code,
      level: question.level,
      text: question.template,
      personalizedText: cached.text,
      rationale,
    };
  }

  const result = await personalizeQuestion({
    template: question.template,
    competency: question.competency.code,
    companyName: session.targetCompany?.name,
    jobRole: session.jobRole,
    resumeText: session.resume?.rawText,
    excludeHighlights: stored.usedHighlights ?? [],
  });

  const personalizedQuestions = {
    ...stored.personalizedQuestions,
    [question.externalId]: { text: result.text, rubric: result.rubric },
  };

  const usedHighlights = result.usedHighlight
    ? [...new Set([...(stored.usedHighlights ?? []), result.usedHighlight])]
    : stored.usedHighlights;

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      irtState: serializeIrtState({
        ...stored,
        personalizedQuestions,
        usedHighlights,
      }),
    },
  });

  return {
    id: question.id,
    externalId: question.externalId,
    competency: question.competency.code,
    level: question.level,
    text: question.template,
    personalizedText: result.text,
    rationale,
  };
}

/** 채점 시 사용할 질문 전용 루브릭 조회 (클라이언트에는 절대 노출하지 않음) */
export function getQuestionRubric(
  irtState: unknown,
  externalId: string
): string[] | undefined {
  const stored = parseIrtState(irtState);
  return stored.personalizedQuestions?.[externalId]?.rubric;
}

export function displayQuestionText(q: InterviewQuestion | null): string {
  if (!q) return "";
  return q.personalizedText ?? q.text;
}

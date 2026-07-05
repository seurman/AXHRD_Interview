import { prisma } from "@/lib/prisma";
import { parseIrtState, serializeIrtState } from "@/lib/irt-state";
import { personalizeQuestion, buildGenericRubric } from "@/lib/interview/personalize-question";
import {
  applyPressureTone,
  pressureTierLabel,
  type PressureTier,
} from "@/lib/interview/persona";
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

/** 압박 강도(pressureTier)가 주어지면 화면에 보여줄 텍스트에만 톤을 입힌다.
 *  채점에 쓰이는 캐시(personalizedQuestions[...].text)는 건드리지 않는다. */
function withPersona(
  q: InterviewQuestion,
  tier: PressureTier | undefined,
  seed: number
): InterviewQuestion {
  if (!tier) return q;
  const displayed = q.personalizedText ?? q.text;
  return {
    ...q,
    personalizedText: applyPressureTone(displayed, tier, seed),
    pressureTier: tier,
    personaLabel: pressureTierLabel(tier),
  };
}

export async function buildPersonalizedQuestion(
  session: SessionContext,
  question: QuestionRow,
  rationale?: string,
  options?: { skipPersonalization?: boolean; pressureTier?: PressureTier }
): Promise<InterviewQuestion> {
  const stored = parseIrtState(session.irtState);
  const cached = stored.personalizedQuestions?.[question.externalId];
  const seed = stored.administeredIds.length;

  if (cached) {
    return withPersona(
      {
        id: question.id,
        externalId: question.externalId,
        competency: question.competency.code,
        level: question.level,
        text: question.template,
        personalizedText: cached.text,
        rationale,
        resumePersonalized: !!cached.resumePersonalized,
      },
      options?.pressureTier,
      seed
    );
  }

  // 역량당 첫 문항만 자소서 인용(Gemini 호출)으로 맞춤화하고, 나머지 문항은 일반
  // 질문으로 처리해 턴당 지연을 줄인다. 채점 루브릭은 일반 기준으로 캐싱해 둔다.
  if (options?.skipPersonalization) {
    const rubric = buildGenericRubric(question.competency.code);
    const personalizedQuestions = {
      ...stored.personalizedQuestions,
      [question.externalId]: { text: question.template, rubric, resumePersonalized: false },
    };

    await prisma.interviewSession.update({
      where: { id: session.id },
      data: {
        irtState: serializeIrtState({ ...stored, personalizedQuestions }),
      },
    });

    return withPersona(
      {
        id: question.id,
        externalId: question.externalId,
        competency: question.competency.code,
        level: question.level,
        text: question.template,
        rationale,
        resumePersonalized: false,
      },
      options?.pressureTier,
      seed
    );
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
    [question.externalId]: {
      text: result.text,
      rubric: result.rubric,
      resumePersonalized: result.text !== question.template,
    },
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

  return withPersona(
    {
      id: question.id,
      externalId: question.externalId,
      competency: question.competency.code,
      level: question.level,
      text: question.template,
      personalizedText: result.text,
      rationale,
      resumePersonalized: result.text !== question.template,
    },
    options?.pressureTier,
    seed
  );
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

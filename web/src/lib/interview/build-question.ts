import { prisma } from "@/lib/prisma";
import { parseIrtState, serializeIrtState } from "@/lib/irt-state";
import {
  personalizeQuestion,
  buildGenericRubric,
  type InterviewStyleHint,
} from "@/lib/interview/personalize-question";
import type { ResumeSummary } from "@/lib/interview/resume-summary";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { rubricForCompetencyLevel } from "@/lib/competency/rubric";
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
  rubricCriteria?: unknown;
  competency: { code: string; rubricByLevel?: unknown };
};

function rubricForQuestion(question: QuestionRow): string[] {
  const stored = parseRubricCriteria(question.rubricCriteria);
  if (stored.length > 0) return stored;
  const compLevel = rubricForCompetencyLevel(question.competency.rubricByLevel, question.level);
  if (compLevel.length > 0) return compLevel;
  return buildGenericRubric(question.competency.code);
}

type SessionContext = {
  id: string;
  irtState: unknown;
  jobRole: string;
  resume?: { rawText: string; parsedTags?: unknown } | null;
  targetCompany?: { name: string; interviewStyle?: unknown } | null;
};

/** Resume.parsedTags(Json)를 안전하게 ResumeSummary로 파싱한다 — 아직 요약이 없는
 *  옛날 레코드(null)나 예상 못한 형태면 undefined를 반환해 레거시 원문 폴백을 타게 한다. */
export function parseResumeSummary(raw: unknown): ResumeSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.summary === "string" &&
    Array.isArray(o.skills) &&
    Array.isArray(o.experiences) &&
    Array.isArray(o.keywords)
  ) {
    return o as unknown as ResumeSummary;
  }
  return undefined;
}

/** TargetCompany.interviewStyle(Json)을 안전하게 파싱한다 — JD 매핑이나 프리셋에서
 *  { tone, rounds, focus } 형태로 저장되지만 형식이 다르면 조용히 무시한다. */
function parseInterviewStyle(raw: unknown): InterviewStyleHint | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.tone !== "string" || !Array.isArray(obj.focus)) return undefined;
  const focus = obj.focus.filter((f): f is string => typeof f === "string");
  if (focus.length === 0) return undefined;
  return { tone: obj.tone, focus };
}

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
    const rubric = rubricForQuestion(question);
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
    resumeSummary: parseResumeSummary(session.resume?.parsedTags),
    legacyResumeText: session.resume?.rawText,
    excludeHighlights: stored.usedHighlights ?? [],
    interviewStyle: parseInterviewStyle(session.targetCompany?.interviewStyle),
  });

  const adminRubric = parseRubricCriteria(question.rubricCriteria);
  const rubric = adminRubric.length > 0 ? adminRubric : result.rubric;

  const personalizedQuestions = {
    ...stored.personalizedQuestions,
    [question.externalId]: {
      text: result.text,
      rubric,
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

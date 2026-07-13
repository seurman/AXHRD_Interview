import { prisma } from "@/lib/prisma";
import { parseIrtState, serializeIrtState } from "@/lib/irt-state";
import {
  personalizeQuestion,
  type InterviewStyleHint,
} from "@/lib/interview/personalize-question";
import type { ResumeSummary } from "@/lib/interview/resume-summary";
import { normalizeResumeSummary } from "@/lib/interview/resume-summary";
import { resolveRubricCriteria } from "@/lib/competency/rubric-ssot";
import type { QuestionRubricContext } from "@/lib/competency/rubric-loader";
import { parseJdRequirements } from "@/lib/company/jd-mapper";
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
  rubricContext?: QuestionRubricContext;
};

function rubricForQuestion(
  question: QuestionRow,
  orgKitRubric?: string[] | null,
): string[] {
  return resolveRubricCriteria({
    orgKitRubric,
    questionCriteria: question.rubricCriteria,
    questionLevel: question.level,
    competencyCode: question.competency.code,
    legacyRubricByLevel: question.competency.rubricByLevel,
    mappedRubricDetails: question.rubricContext?.mappedDetails,
    defaultRubricDetails: question.rubricContext?.defaultDetails,
  });
}

type SessionContext = {
  id: string;
  userId?: string;
  irtState: unknown;
  jobRole: string;
  resume?: { id?: string; rawText: string; parsedTags?: unknown } | null;
  targetCompany?: { name: string; interviewStyle?: unknown; jdRequirements?: unknown } | null;
};

/** Resume.parsedTags(Json)를 안전하게 ResumeSummary로 파싱한다 — 아직 요약이 없는
 *  옛날 레코드(null)나 예상 못한 형태면 undefined를 반환해 레거시 원문 폴백을 타게 한다. */
export function parseResumeSummary(raw: unknown): ResumeSummary | undefined {
  return normalizeResumeSummary(raw);
}

/** TargetCompany.interviewStyle(Json)을 안전하게 파싱한다 */
export function parseInterviewStyle(raw: unknown): InterviewStyleHint | undefined {
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
  options?: {
    skipPersonalization?: boolean;
    pressureTier?: PressureTier;
    /** 기관 인터뷰 킷 customRubricCriteria — 있으면 플랫폼/문항 루브릭 대신 사용 */
    orgKitRubric?: string[] | null;
    /** RubricSet 컨텍스트 — 미전달 시 question.rubricContext 또는 DB 조회 */
    rubricContext?: QuestionRubricContext;
  }
): Promise<InterviewQuestion> {
  let rubricContext = options?.rubricContext ?? question.rubricContext;
  if (!rubricContext) {
    const { loadRubricContextForQuestion } = await import("@/lib/competency/rubric-loader");
    rubricContext = await loadRubricContextForQuestion(question.id);
  }
  const questionWithRubric: QuestionRow = { ...question, rubricContext };
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
        resumeAnchors: cached.resumeAnchors,
      },
      options?.pressureTier,
      seed
    );
  }

  // skipPersonalization이 true일 때만 Gemini 미호출 — 기본은 매 문항 개인화 시도
  if (options?.skipPersonalization) {
    const rubric = rubricForQuestion(questionWithRubric, options.orgKitRubric);
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

  const resumeSummary = parseResumeSummary(session.resume?.parsedTags);
  let ontologyHints:
    | {
        preferredChunks?: Array<{ title: string; markdown: string; tags?: string[] }>;
        preferredExperiences?: string[];
        performanceBand?: string;
      }
    | undefined;

  if (session.userId && resumeSummary) {
    try {
      const { resolveEvidenceForCompetency } = await import("@/lib/interview/resume-ontology");
      const resolved = await resolveEvidenceForCompetency({
        userId: session.userId,
        resumeId: session.resume?.id,
        summary: resumeSummary,
        competency: question.competency.code,
      });
      if (resolved.claims.length > 0) {
        const { performanceBand } = await import("@/lib/interview/resume-evidence");
        ontologyHints = {
          preferredChunks: resolved.chunkTexts,
          preferredExperiences: resolved.experiences,
          performanceBand: performanceBand(resolved.performance),
        };
      }
    } catch (e) {
      console.warn("[build-question] ontology resolve failed:", e);
    }
  }

  const result = await personalizeQuestion({
    template: question.template,
    competency: question.competency.code,
    companyName: session.targetCompany?.name,
    jobRole: session.jobRole,
    resumeSummary,
    legacyResumeText: session.resume?.rawText,
    excludeHighlights: stored.usedHighlights ?? [],
    excludeJdTerms: stored.usedJdTerms ?? [],
    jdRequirements: parseJdRequirements(session.targetCompany?.jdRequirements),
    interviewStyle: parseInterviewStyle(session.targetCompany?.interviewStyle),
    ontologyHints,
  });

  const resolvedRubric = rubricForQuestion(questionWithRubric, options?.orgKitRubric);
  const rubric = resolvedRubric.length > 0 ? resolvedRubric : result.rubric;

  const resumePersonalized = result.text !== question.template;
  const personalizedQuestions = {
    ...stored.personalizedQuestions,
    [question.externalId]: {
      text: result.text,
      rubric,
      resumePersonalized,
      resumeAnchors: resumePersonalized ? result.resumeAnchors : undefined,
    },
  };

  const usedHighlights = result.usedHighlight
    ? [...new Set([...(stored.usedHighlights ?? []), result.usedHighlight])]
    : stored.usedHighlights;
  const usedJdTerms = result.usedJdTerm
    ? [...new Set([...(stored.usedJdTerms ?? []), result.usedJdTerm])]
    : stored.usedJdTerms;

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      irtState: serializeIrtState({
        ...stored,
        personalizedQuestions,
        usedHighlights,
        usedJdTerms,
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
      resumePersonalized,
      resumeAnchors: resumePersonalized ? result.resumeAnchors : undefined,
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

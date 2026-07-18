import { prisma } from "@/lib/prisma";
import { ratingScaleFromAnchors } from "@/lib/assessment/evidence-report";
import type { RatingScaleRow } from "@/types/evidence-assessment";
import type { EvidenceAssessmentDomain, Prisma } from "@prisma/client";

/** 시나리오 자체에 붙은 역량 프레임(하위역량·행동지표) — 채점 프롬프트 주입용 */
export type ScenarioFramework = {
  code: string;
  nameKo: string;
  definition: string;
  subskills: Array<{
    code: string;
    nameKo: string;
    definition: string;
    indicators: Array<{
      code: string;
      polarity: "POSITIVE" | "NEGATIVE_OR_MISSING";
      textKo: string;
    }>;
  }>;
};

export const SCENARIO_WITH_FRAMEWORK_INCLUDE = {
  competencies: {
    orderBy: { sortOrder: "asc" },
    include: {
      subskills: {
        orderBy: { sortOrder: "asc" },
        include: { indicators: { orderBy: { sortOrder: "asc" } } },
      },
    },
  },
  inBasketItems: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.AssessmentScenarioInclude;

export type ScenarioWithFramework = Prisma.AssessmentScenarioGetPayload<{
  include: typeof SCENARIO_WITH_FRAMEWORK_INCLUDE;
}>;

export function frameworksFromScenario(
  scenario: ScenarioWithFramework,
): ScenarioFramework[] {
  return scenario.competencies.map((c) => ({
    code: c.competencyCode,
    nameKo: c.nameKo,
    definition: c.definition,
    subskills: c.subskills.map((s) => ({
      code: s.code,
      nameKo: s.nameKo,
      definition: s.definition,
      indicators: s.indicators.map((i) => ({
        code: i.code,
        polarity: i.polarity as "POSITIVE" | "NEGATIVE_OR_MISSING",
        textKo: i.textKo,
      })),
    })),
  }));
}

export async function loadScenarioWithFramework(
  scenarioId: string,
): Promise<ScenarioWithFramework | null> {
  return prisma.assessmentScenario.findUnique({
    where: { id: scenarioId },
    include: SCENARIO_WITH_FRAMEWORK_INCLUDE,
  });
}

export async function loadRatingScale(
  domain: EvidenceAssessmentDomain,
): Promise<RatingScaleRow[]> {
  const anchors = await prisma.ratingScaleAnchor.findMany({
    where: { domain },
    orderBy: { score: "desc" },
  });
  return ratingScaleFromAnchors(anchors);
}

/** 응시자에게 보여줘도 되는 시나리오 정보만 추린다.
 *  personaProfile·urgency·importance·isDistractor·targetCompetencyCode는
 *  채점 기준/연기 전략이므로 절대 포함하지 않는다. */
export function toCandidateScenarioPayload(scenario: ScenarioWithFramework) {
  return {
    id: scenario.id,
    code: scenario.code,
    kind: scenario.kind,
    titleKo: scenario.titleKo,
    roleContext: scenario.roleContext,
    taskBrief: scenario.taskBrief,
    durationMinutes: scenario.durationMinutes,
    maxTurns: scenario.maxTurns,
    personaName: scenario.personaName,
    personaRole: scenario.personaRole,
    openingLine: scenario.openingLine,
    competencies: scenario.competencies.map((c) => ({
      code: c.competencyCode,
      nameKo: c.nameKo,
    })),
    items: scenario.inBasketItems.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      fromLabel: item.fromLabel,
      subject: item.subject,
      body: item.body,
    })),
  };
}

export type CandidateScenarioPayload = ReturnType<typeof toCandidateScenarioPayload>;

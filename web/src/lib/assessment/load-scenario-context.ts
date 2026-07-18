import { prisma } from "@/lib/prisma";
import { ratingScaleFromAnchors } from "@/lib/assessment/evidence-report";
import type {
  AssessmentFrameworkSnapshot,
  CompetencyFrameworkSnapshot,
  RubricLevelSnapshot,
} from "@/lib/assessment/framework-snapshot";
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
      competency: {
        select: {
          id: true,
          code: true,
          nameKo: true,
          description: true,
          rubricByLevel: true,
        },
      },
      rubricSet: {
        include: {
          details: { orderBy: { scoreLevel: "asc" } },
        },
      },
      subskills: {
        orderBy: { sortOrder: "asc" },
        include: { indicators: { orderBy: { sortOrder: "asc" } } },
      },
    },
  },
  inBasketItems: {
    orderBy: { sortOrder: "asc" },
    include: {
      targetCompetency: {
        select: { id: true, code: true, nameKo: true },
      },
    },
  },
} satisfies Prisma.AssessmentScenarioInclude;

export type ScenarioWithFramework = Prisma.AssessmentScenarioGetPayload<{
  include: typeof SCENARIO_WITH_FRAMEWORK_INCLUDE;
}>;

function splitCriteria(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function rubricLevelsFromSet(
  details: Array<{ scoreLevel: number; levelName: string | null; behavioralIndicator: string }>,
): RubricLevelSnapshot[] {
  return details.map((d) => ({
    scoreLevel: d.scoreLevel,
    levelName: d.levelName,
    criteria: splitCriteria(d.behavioralIndicator),
  }));
}

function rubricLevelsFromLegacy(rubricByLevel: unknown): RubricLevelSnapshot[] {
  if (!rubricByLevel || typeof rubricByLevel !== "object") return [];
  const obj = rubricByLevel as Record<string, unknown>;
  const levels: RubricLevelSnapshot[] = [];
  for (let score = 1; score <= 5; score += 1) {
    const raw = obj[String(score)];
    if (!Array.isArray(raw)) continue;
    const criteria = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    if (criteria.length === 0) continue;
    levels.push({ scoreLevel: score, levelName: null, criteria });
  }
  return levels;
}

export function frameworksFromScenario(
  scenario: ScenarioWithFramework,
): ScenarioFramework[] {
  return scenario.competencies.map((c) => {
    const bank = c.competency;
    return {
      code: bank?.code ?? c.competencyCode,
      nameKo: bank?.nameKo ?? c.nameKo,
      definition: bank?.description ?? c.definition,
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
    };
  });
}

/** 채점용: 행동지표 프레임 + 1~5점 루브릭 */
export function competencyFrameworksWithRubrics(
  scenario: ScenarioWithFramework,
): CompetencyFrameworkSnapshot[] {
  return scenario.competencies.map((c) => {
    const bank = c.competency;
    const base = {
      code: bank?.code ?? c.competencyCode,
      nameKo: bank?.nameKo ?? c.nameKo,
      definition: bank?.description ?? c.definition,
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
    };
    const fromSet = c.rubricSet ? rubricLevelsFromSet(c.rubricSet.details) : [];
    const scoringLevels =
      fromSet.length > 0
        ? fromSet
        : rubricLevelsFromLegacy(bank?.rubricByLevel ?? null);

    return {
      ...base,
      competencyId: c.competencyId ?? bank?.id ?? null,
      rubricSetId: c.rubricSetId ?? c.rubricSet?.id ?? null,
      rubricName: c.rubricSet?.rubricName ?? null,
      scoringLevels,
    };
  });
}

export function buildFrameworkSnapshot(
  scenario: ScenarioWithFramework,
): AssessmentFrameworkSnapshot {
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    scenarioId: scenario.id,
    scenarioCode: scenario.code,
    scenarioVersion: scenario.version,
    competencies: competencyFrameworksWithRubrics(scenario),
  };
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
      code: c.competency?.code ?? c.competencyCode,
      nameKo: c.competency?.nameKo ?? c.nameKo,
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

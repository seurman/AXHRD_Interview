import { describe, expect, it } from "vitest";
import { validateScenarioForPublish } from "@/lib/assessment/scenario-publish";
import type { ScenarioWithFramework } from "@/lib/assessment/load-scenario-context";

function baseScenario(
  overrides: Partial<ScenarioWithFramework> = {},
): ScenarioWithFramework {
  return {
    id: "s1",
    code: "RP_TEST",
    kind: "ROLE_PLAY",
    status: "DRAFT",
    version: 1,
    titleKo: "테스트 과제",
    reportKindLabel: "ASSESSMENT REPORT · 역할수행 과제",
    roleContext: "팀장",
    taskBrief: "브리핑",
    durationMinutes: 15,
    recommendedSequence: null,
    isActive: false,
    sortOrder: 0,
    organizationId: null,
    sourceId: null,
    publishedAt: null,
    personaName: "김대리",
    personaRole: "팀원",
    personaProfile: "방어적",
    openingLine: "안녕하세요",
    maxTurns: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
    competencies: [
      {
        id: "c1",
        scenarioId: "s1",
        competencyId: "bank1",
        rubricSetId: "rs1",
        competencyCode: "COMMUNICATION",
        nameKo: "의사소통",
        definition: "정의",
        sortOrder: 0,
        competency: {
          id: "bank1",
          code: "COMMUNICATION",
          nameKo: "의사소통",
          description: "정의",
          rubricByLevel: null,
        },
        rubricSet: {
          id: "rs1",
          organizationId: null,
          competencyId: "bank1",
          rubricName: "기본",
          scoringSystem: "FIVE_SCALE",
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          details: [
            {
              id: "d1",
              rubricSetId: "rs1",
              scoreLevel: 1,
              levelName: "미흡",
              behavioralIndicator: "기준1",
            },
            {
              id: "d3",
              rubricSetId: "rs1",
              scoreLevel: 3,
              levelName: "보통",
              behavioralIndicator: "기준3",
            },
            {
              id: "d5",
              rubricSetId: "rs1",
              scoreLevel: 5,
              levelName: "우수",
              behavioralIndicator: "기준5",
            },
          ],
        },
        subskills: [
          {
            id: "sub1",
            scenarioCompetencyId: "c1",
            code: "LISTEN",
            nameKo: "경청",
            definition: "경청",
            sortOrder: 0,
            indicators: [
              {
                id: "i1",
                subskillId: "sub1",
                code: "P1",
                polarity: "POSITIVE",
                textKo: "요약한다",
                sortOrder: 0,
              },
            ],
          },
        ],
      },
    ],
    inBasketItems: [],
    ...overrides,
  } as ScenarioWithFramework;
}

describe("validateScenarioForPublish", () => {
  it("accepts a complete role-play scenario", () => {
    expect(validateScenarioForPublish(baseScenario())).toEqual([]);
  });

  it("requires persona fields for role-play", () => {
    const issues = validateScenarioForPublish(
      baseScenario({ personaName: null, openingLine: null }),
    );
    expect(issues.some((i) => i.field === "personaName")).toBe(true);
    expect(issues.some((i) => i.field === "openingLine")).toBe(true);
  });

  it("requires in-basket items for in-basket kind", () => {
    const issues = validateScenarioForPublish(
      baseScenario({
        kind: "IN_BASKET",
        personaName: null,
        personaRole: null,
        personaProfile: null,
        openingLine: null,
        inBasketItems: [],
      }),
    );
    expect(issues.some((i) => i.field === "inBasketItems")).toBe(true);
  });

  it("requires competency bank link and rubric levels", () => {
    const scenario = baseScenario();
    scenario.competencies[0].competencyId = null;
    scenario.competencies[0].competency = null;
    scenario.competencies[0].rubricSet = null;
    scenario.competencies[0].rubricSetId = null;
    const issues = validateScenarioForPublish(scenario);
    expect(issues.some((i) => i.field.includes("competencies.COMMUNICATION"))).toBe(
      true,
    );
  });
});

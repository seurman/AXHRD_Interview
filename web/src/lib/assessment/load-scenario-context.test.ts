import { describe, expect, it } from "vitest";
import {
  competencyFrameworksWithRubrics,
  frameworksFromScenario,
} from "@/lib/assessment/load-scenario-context";
import type { ScenarioWithFramework } from "@/lib/assessment/load-scenario-context";

function scenarioFixture(
  overrides: Partial<ScenarioWithFramework> = {},
): ScenarioWithFramework {
  return {
    id: "s1",
    code: "RP_TEST",
    kind: "ROLE_PLAY",
    status: "DRAFT",
    version: 1,
    titleKo: "테스트",
    reportKindLabel: "ASSESSMENT REPORT",
    roleContext: null,
    taskBrief: "브리핑",
    durationMinutes: 15,
    recommendedSequence: null,
    isActive: false,
    sortOrder: 0,
    organizationId: null,
    sourceId: null,
    publishedAt: null,
    personaName: "상대",
    personaRole: null,
    personaProfile: "지침",
    openingLine: "안녕",
    maxTurns: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
    competencies: [
      {
        id: "sc1",
        scenarioId: "s1",
        competencyId: "bank1",
        rubricSetId: "rs1",
        competencyCode: "LEGACY_CODE",
        nameKo: "레거시이름",
        definition: "레거시정의",
        sortOrder: 0,
        competency: {
          id: "bank1",
          code: "COMM",
          nameKo: "의사소통",
          description: "은행 정의",
          rubricByLevel: { "1": ["미흡"], "3": ["보통"], "5": ["우수"] },
        },
        rubricSet: {
          id: "rs1",
          organizationId: null,
          competencyId: "bank1",
          rubricName: "기본 5점",
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
            scenarioCompetencyId: "sc1",
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

describe("load-scenario-context frameworks", () => {
  it("prefers bank competency fields over embedded snapshot text", () => {
    const frameworks = frameworksFromScenario(scenarioFixture());
    expect(frameworks[0].code).toBe("COMM");
    expect(frameworks[0].nameKo).toBe("의사소통");
    expect(frameworks[0].definition).toBe("은행 정의");
  });

  it("falls back to embedded tree when bank FK is missing", () => {
    const scenario = scenarioFixture();
    scenario.competencies[0].competencyId = null;
    scenario.competencies[0].competency = null;
    scenario.competencies[0].rubricSetId = null;
    scenario.competencies[0].rubricSet = null;
    const frameworks = frameworksFromScenario(scenario);
    expect(frameworks[0].code).toBe("LEGACY_CODE");
    expect(frameworks[0].nameKo).toBe("레거시이름");
  });

  it("uses RubricSet details first, then legacy rubricByLevel", () => {
    const withSet = competencyFrameworksWithRubrics(scenarioFixture());
    expect(withSet[0].scoringLevels).toHaveLength(3);
    expect(withSet[0].scoringLevels[0].scoreLevel).toBe(1);
    expect(withSet[0].rubricName).toBe("기본 5점");

    const scenario = scenarioFixture();
    scenario.competencies[0].rubricSetId = null;
    scenario.competencies[0].rubricSet = null;
    const legacy = competencyFrameworksWithRubrics(scenario);
    expect(legacy[0].scoringLevels.map((l) => l.scoreLevel)).toEqual([1, 3, 5]);
  });
});

import { describe, expect, it } from "vitest";
import {
  resolveAttemptGradingFrameworks,
  toGradingPayloadFrameworks,
} from "@/lib/assessment/grade-attempt";
import type { ScenarioWithFramework } from "@/lib/assessment/load-scenario-context";
import type { CompetencyFrameworkSnapshot } from "@/lib/assessment/framework-snapshot";

const liveFramework: CompetencyFrameworkSnapshot = {
  code: "LIVE",
  nameKo: "현재역량",
  definition: "live",
  competencyId: "c-live",
  rubricSetId: "r-live",
  rubricName: "live",
  scoringLevels: [{ scoreLevel: 3, levelName: "보통", criteria: ["live"] }],
  subskills: [
    {
      code: "S1",
      nameKo: "하위",
      definition: "d",
      indicators: [{ code: "P1", polarity: "POSITIVE", textKo: "관찰" }],
    },
  ],
};

function scenarioStub(): ScenarioWithFramework {
  return {
    id: "s1",
    code: "RP",
    kind: "ROLE_PLAY",
    status: "PUBLISHED",
    version: 1,
    titleKo: "t",
    reportKindLabel: "r",
    roleContext: null,
    taskBrief: "b",
    durationMinutes: 15,
    recommendedSequence: null,
    isActive: true,
    sortOrder: 0,
    organizationId: null,
    sourceId: null,
    publishedAt: new Date(),
    personaName: "p",
    personaRole: null,
    personaProfile: "x",
    openingLine: "hi",
    maxTurns: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
    competencies: [
      {
        id: "sc1",
        scenarioId: "s1",
        competencyId: "c-live",
        rubricSetId: "r-live",
        competencyCode: "LIVE",
        nameKo: "현재역량",
        definition: "live",
        sortOrder: 0,
        competency: {
          id: "c-live",
          code: "LIVE",
          nameKo: "현재역량",
          description: "live",
          rubricByLevel: null,
        },
        rubricSet: {
          id: "r-live",
          organizationId: null,
          competencyId: "c-live",
          rubricName: "live",
          scoringSystem: "FIVE_SCALE",
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          details: [
            {
              id: "d3",
              rubricSetId: "r-live",
              scoreLevel: 3,
              levelName: "보통",
              behavioralIndicator: "live",
            },
          ],
        },
        subskills: [
          {
            id: "sub1",
            scenarioCompetencyId: "sc1",
            code: "S1",
            nameKo: "하위",
            definition: "d",
            sortOrder: 0,
            indicators: [
              {
                id: "i1",
                subskillId: "sub1",
                code: "P1",
                polarity: "POSITIVE",
                textKo: "관찰",
                sortOrder: 0,
              },
            ],
          },
        ],
      },
    ],
    inBasketItems: [],
  } as ScenarioWithFramework;
}

describe("grading payload frameworks", () => {
  it("splits scoringRubric and behavioralIndicators", () => {
    const payload = toGradingPayloadFrameworks([liveFramework]);
    expect(payload[0].scoringRubric[0]).toEqual({
      score: 3,
      levelName: "보통",
      criteria: ["live"],
    });
    expect(payload[0].behavioralIndicators[0].indicators[0].code).toBe("P1");
  });

  it("prefers attempt snapshot over live scenario frameworks", () => {
    const snapshot = {
      schemaVersion: 1,
      capturedAt: "2026-07-18T00:00:00.000Z",
      scenarioId: "s1",
      scenarioCode: "RP",
      scenarioVersion: 1,
      competencies: [
        {
          ...liveFramework,
          code: "SNAP",
          nameKo: "스냅샷역량",
        },
      ],
    };
    const frameworks = resolveAttemptGradingFrameworks({
      frameworkSnapshot: snapshot,
      scenario: scenarioStub(),
    });
    expect(frameworks[0].code).toBe("SNAP");
    expect(frameworks[0].nameKo).toBe("스냅샷역량");
  });

  it("falls back to live scenario when snapshot is missing", () => {
    const frameworks = resolveAttemptGradingFrameworks({
      frameworkSnapshot: null,
      scenario: scenarioStub(),
    });
    expect(frameworks[0].code).toBe("LIVE");
  });
});

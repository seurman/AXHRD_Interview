import { describe, expect, it } from "vitest";
import { toGradingPayloadFrameworks } from "@/lib/assessment/grade-attempt";
import type { CompetencyFrameworkSnapshot } from "@/lib/assessment/framework-snapshot";
import { validateScenarioForPublish } from "@/lib/assessment/scenario-publish";
import type { ScenarioWithFramework } from "@/lib/assessment/load-scenario-context";

describe("admin publish + grading contract", () => {
  it("splits rubric scores from behavior checkpoints in grading payload", () => {
    const frameworks: CompetencyFrameworkSnapshot[] = [
      {
        code: "COMM",
        nameKo: "의사소통",
        definition: "d",
        competencyId: "c1",
        rubricSetId: "r1",
        rubricName: "기본",
        scoringLevels: [
          { scoreLevel: 1, levelName: "미흡", criteria: ["c1"] },
          { scoreLevel: 5, levelName: "탁월", criteria: ["c5"] },
        ],
        subskills: [
          {
            code: "LISTEN",
            nameKo: "경청",
            definition: "d",
            indicators: [
              { code: "P1", polarity: "POSITIVE", textKo: "요약" },
              { code: "N1", polarity: "NEGATIVE_OR_MISSING", textKo: "끊음" },
            ],
          },
        ],
      },
    ];

    const payload = toGradingPayloadFrameworks(frameworks);
    expect(payload[0].scoringRubric).toEqual([
      { score: 1, levelName: "미흡", criteria: ["c1"] },
      { score: 5, levelName: "탁월", criteria: ["c5"] },
    ]);
    expect(payload[0].behavioralIndicators[0].indicators).toHaveLength(2);
    expect(payload[0]).not.toHaveProperty("scoringLevels");
  });

  it("blocks publish when role-play persona fields are missing", () => {
    const scenario = {
      id: "s1",
      code: "RP",
      kind: "ROLE_PLAY",
      titleKo: "과제",
      taskBrief: "브리핑",
      personaName: null,
      personaProfile: null,
      openingLine: null,
      maxTurns: 6,
      competencies: [
        {
          id: "c1",
          competencyId: "bank",
          competencyCode: "COMM",
          nameKo: "의사소통",
          definition: "d",
          rubricSetId: "rs",
          competency: {
            id: "bank",
            code: "COMM",
            nameKo: "의사소통",
            description: "d",
            rubricByLevel: null,
          },
          rubricSet: {
            id: "rs",
            organizationId: null,
            competencyId: "bank",
            rubricName: "기본",
            scoringSystem: "FIVE_SCALE",
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            details: [1, 2, 3, 4, 5].map((scoreLevel) => ({
              id: `d${scoreLevel}`,
              rubricSetId: "rs",
              scoreLevel,
              levelName: String(scoreLevel),
              behavioralIndicator: `l${scoreLevel}`,
            })),
          },
          subskills: [
            {
              id: "sub",
              scenarioCompetencyId: "c1",
              code: "CORE",
              nameKo: "핵심",
              definition: "d",
              sortOrder: 0,
              indicators: [
                {
                  id: "i1",
                  subskillId: "sub",
                  code: "P1",
                  polarity: "POSITIVE",
                  textKo: "긍정",
                  sortOrder: 0,
                },
                {
                  id: "i2",
                  subskillId: "sub",
                  code: "N1",
                  polarity: "NEGATIVE_OR_MISSING",
                  textKo: "부정",
                  sortOrder: 1,
                },
              ],
            },
          ],
        },
      ],
      inBasketItems: [],
    } as unknown as ScenarioWithFramework;

    const issues = validateScenarioForPublish(scenario);
    expect(issues.map((i) => i.field)).toEqual(
      expect.arrayContaining(["personaName", "personaProfile", "openingLine"]),
    );
  });
});

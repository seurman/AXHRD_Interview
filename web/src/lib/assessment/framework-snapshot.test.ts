import { describe, expect, it } from "vitest";
import {
  frameworksFromSnapshot,
  parseAssessmentFrameworkSnapshot,
} from "@/lib/assessment/framework-snapshot";

describe("framework snapshot", () => {
  it("parses a valid snapshot", () => {
    const raw = {
      schemaVersion: 1,
      capturedAt: "2026-07-18T00:00:00.000Z",
      scenarioId: "s1",
      scenarioCode: "RP_TEST",
      scenarioVersion: 2,
      competencies: [
        {
          code: "COMMUNICATION",
          nameKo: "의사소통",
          definition: "d",
          competencyId: "c1",
          rubricSetId: "r1",
          rubricName: "기본",
          scoringLevels: [{ scoreLevel: 3, levelName: "보통", criteria: ["c"] }],
          subskills: [
            {
              code: "LISTEN",
              nameKo: "경청",
              definition: "d",
              indicators: [
                {
                  code: "P1",
                  polarity: "POSITIVE",
                  textKo: "요약",
                },
              ],
            },
          ],
        },
      ],
    };
    const parsed = parseAssessmentFrameworkSnapshot(raw);
    expect(parsed?.scenarioVersion).toBe(2);
    expect(frameworksFromSnapshot(parsed!)[0].code).toBe("COMMUNICATION");
  });

  it("rejects invalid snapshots", () => {
    expect(parseAssessmentFrameworkSnapshot({ schemaVersion: 2 })).toBeNull();
  });
});

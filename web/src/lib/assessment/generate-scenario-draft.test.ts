import { describe, expect, it } from "vitest";
import { parseScenarioDraftJson } from "@/lib/assessment/generate-scenario-draft";

describe("parseScenarioDraftJson", () => {
  it("parses a role-play draft", () => {
    const draft = parseScenarioDraftJson(
      {
        kind: "ROLE_PLAY",
        titleKo: "저성과 면담",
        roleContext: "팀장",
        taskBrief: "면담을 진행하세요",
        maxTurns: 6,
        personaName: "김대리",
        personaProfile: "방어적",
        openingLine: "부르셨나요",
        competencies: [
          {
            competencyCode: "communication",
            nameKo: "의사소통",
            definition: "정의",
            subskills: [
              {
                code: "listen",
                nameKo: "경청",
                definition: "경청",
                indicators: [
                  { code: "p1", polarity: "POSITIVE", textKo: "요약" },
                  {
                    code: "n1",
                    polarity: "NEGATIVE_OR_MISSING",
                    textKo: "끊음",
                  },
                ],
              },
            ],
          },
        ],
      },
      "ROLE_PLAY",
    );
    expect(draft?.kind).toBe("ROLE_PLAY");
    expect(draft?.competencies[0].competencyCode).toBe("COMMUNICATION");
    if (draft?.kind === "ROLE_PLAY") {
      expect(draft.personaName).toBe("김대리");
    }
  });

  it("rejects in-basket drafts with fewer than 3 items", () => {
    const draft = parseScenarioDraftJson(
      {
        titleKo: "서류함",
        taskBrief: "처리하세요",
        items: [
          { fromLabel: "A", subject: "1", body: "b" },
          { fromLabel: "B", subject: "2", body: "b" },
        ],
        competencies: [
          {
            competencyCode: "LEADERSHIP",
            nameKo: "리더십",
            definition: "d",
            subskills: [],
          },
        ],
      },
      "IN_BASKET",
    );
    expect(draft).toBeNull();
  });
});

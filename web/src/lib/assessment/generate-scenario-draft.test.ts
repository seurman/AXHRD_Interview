import { describe, expect, it } from "vitest";
import {
  alignCompetenciesToBank,
  parseScenarioDraftJson,
} from "@/lib/assessment/generate-scenario-draft";

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

  it("fills default indicators when subskills are empty", () => {
    const draft = parseScenarioDraftJson(
      {
        titleKo: "역할",
        taskBrief: "진행",
        competencies: [
          {
            competencyCode: "LEAD",
            nameKo: "리더십",
            definition: "d",
            subskills: [],
          },
        ],
      },
      "ROLE_PLAY",
    );
    expect(draft?.competencies[0].subskills[0].indicators.length).toBeGreaterThan(0);
  });
});

describe("alignCompetenciesToBank", () => {
  const bank = [
    { code: "COMM", nameKo: "의사소통", description: "소통" },
    { code: "LEAD", nameKo: "리더십", description: "리드" },
  ];

  it("maps by code and drops unknowns via name fallback", () => {
    const aligned = alignCompetenciesToBank(
      [
        {
          competencyCode: "COMM",
          nameKo: "의사소통",
          definition: "d",
          subskills: [],
        },
        {
          competencyCode: "UNKNOWN",
          nameKo: "리더십",
          definition: "d",
          subskills: [],
        },
      ],
      bank,
    );
    expect(aligned.map((c) => c.competencyCode)).toEqual(["COMM", "LEAD"]);
  });

  it("falls back to bank competencies when none match", () => {
    const aligned = alignCompetenciesToBank(
      [
        {
          competencyCode: "ZZZ",
          nameKo: "없는역량",
          definition: "d",
          subskills: [],
        },
      ],
      bank,
    );
    expect(aligned.length).toBeGreaterThan(0);
    expect(aligned[0].competencyCode).toBe("COMM");
  });
});

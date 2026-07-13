import { describe, expect, it } from "vitest";
import {
  averageDimensions,
  normalizeAnswerDimensions,
  normalizeCompetencyDimensions,
} from "./answer-dimensions";
import { mapResponseForReport } from "./report-response";

const SAMPLE_6AXIS = {
  questionIntent: 0.7,
  situationSpecificity: 0.6,
  individualOwnership: 0.55,
  logic: 0.65,
  outcomeQuantification: 0.5,
  delivery: 0.8,
};

describe("dimensions persistence mapping", () => {
  it("mapResponseForReport passes normalized dimensions", () => {
    const mapped = mapResponseForReport({
      question: { template: "질문 텍스트" },
      competency: "COMMUNICATION",
      transcript: "원문",
      correctedTranscript: "교정",
      dimensions: SAMPLE_6AXIS,
      rubricScore: 0.72,
      followUpQuestion: null,
      followUpTranscript: null,
      followUpCorrectedTranscript: null,
    });

    expect(mapped.dimensions).toEqual(SAMPLE_6AXIS);
  });

  it("averages per-turn dimensions to 0-100 competency scale", () => {
    const perTurn = [
      SAMPLE_6AXIS,
      {
        questionIntent: 0.6,
        situationSpecificity: 0.5,
        individualOwnership: 0.45,
        logic: 0.55,
        outcomeQuantification: 0.4,
        delivery: 0.65,
      },
    ];
    const measured = normalizeCompetencyDimensions(averageDimensions(perTurn)!);
    expect(measured).toEqual({
      questionIntent: 65,
      situationSpecificity: 55,
      individualOwnership: 50,
      logic: 60,
      outcomeQuantification: 45,
      delivery: 73,
    });
  });

  it("returns null for missing dimensions without throwing", () => {
    expect(normalizeAnswerDimensions(null)).toBeNull();
    expect(normalizeAnswerDimensions(undefined)).toBeNull();
  });

  it("upgrades legacy 4-axis stored dimensions without empty axes", () => {
    const legacy = normalizeAnswerDimensions({
      starStructure: 0.6,
      questionIntent: 0.8,
      logic: 0.7,
      delivery: 0.8,
    });
    expect(legacy).not.toBeNull();
    expect(legacy!.situationSpecificity).toBe(0.6);
    expect(legacy!.individualOwnership).toBe(0.6);
    expect(legacy!.outcomeQuantification).toBe(0.6);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildReversedSet,
  computeArcScoresFromAnswers,
  type ScoredAnswers,
} from "./arc-scoring";

function fillAxis(codes: string[], value: number): ScoredAnswers {
  const answers: ScoredAnswers = {};
  for (const code of codes) {
    answers[code] = { current: value, importance: value };
  }
  return answers;
}

describe("arc-scoring report", () => {
  const reversed = buildReversedSet([
    { itemCode: "SE01", isReversed: true },
    { itemCode: "BO01", isReversed: true },
  ] as Array<{ itemCode: string; isReversed: boolean }>);

  it("computes all four axis scores from uniform answers", () => {
    const answers: ScoredAnswers = {
      ...fillAxis(
        [
          "SE01",
          "SE02",
          "SE03",
          "BO01",
          "BO02",
          "TL01",
          "TL02",
          "C01",
          "C02",
          "CD01",
          "CD02",
          "LA01",
          "LA02",
          "HV01",
          "HV02",
          "CV01",
          "CV02",
          "AV01",
          "AV02",
          "SA01",
          "SA02",
          "EA01",
          "EA02",
          "OA01",
          "OA02",
        ],
        4,
      ),
    };

    const scores = computeArcScoresFromAnswers(answers, reversed);
    expect(scores.ohi.overall).not.toBeNull();
    expect(scores.ori.ORI).not.toBeNull();
    expect(scores.ovi.OVI).not.toBeNull();
    expect(scores.oai.OAI).not.toBeNull();
    expect(scores.ohi.band).toBeTruthy();
    expect(scores.oaiPattern).toBeTruthy();
  });

  it("returns null for unanswered axes", () => {
    const answers = fillAxis(["CD01", "CD02", "LA01", "LA02"], 3);
    const scores = computeArcScoresFromAnswers(answers, reversed);
    expect(scores.ohi.overall).toBeNull();
    expect(scores.ori.ORI).not.toBeNull();
    expect(scores.ovi.OVI).toBeNull();
    expect(scores.oai.OAI).toBeNull();
  });
});

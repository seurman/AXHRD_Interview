import { describe, expect, it } from "vitest";
import { ARC_INDEX_SEED } from "../../../prisma/seed/arc-index-data";
import {
  buildReversedSet,
  computeArcScoresFromAnswers,
  type ScoredAnswers,
} from "./arc-scoring";

function answersFromSeed(value = 4): { answers: ScoredAnswers; reversed: Set<string> } {
  const answers: ScoredAnswers = {};
  const revFlags: Array<{ itemCode: string; isReversed: boolean }> = [];
  for (const sec of ARC_INDEX_SEED.sections) {
    for (const it of sec.directItems ?? []) {
      if (it.isDemographic || it.scaleType === "OPEN_TEXT") continue;
      answers[it.itemCode] = {
        current: value,
        importance: it.hasImportanceAxis ? value + 0.5 : undefined,
      };
      if (it.isReversed) revFlags.push({ itemCode: it.itemCode, isReversed: true });
    }
    for (const sub of sec.subscales) {
      for (const it of sub.items) {
        if (it.scaleType === "OPEN_TEXT") continue;
        answers[it.itemCode] = {
          current: value,
          importance: it.hasImportanceAxis ? value + 0.5 : undefined,
        };
        if (it.isReversed) revFlags.push({ itemCode: it.itemCode, isReversed: true });
      }
    }
  }
  return { answers, reversed: buildReversedSet(revFlags) };
}

describe("pruned ARC seed scoring coverage", () => {
  it("produces all core indices from seed Likert only", () => {
    const { answers, reversed } = answersFromSeed(4);
    const s = computeArcScoresFromAnswers(answers, reversed);

    expect(s.ohi.overall).not.toBeNull();
    expect(s.ohi.SE).not.toBeNull();
    expect(s.ohi.BO).not.toBeNull();
    expect(s.ohi.TL.TL).not.toBeNull();
    expect(s.ohi.TL.trust).not.toBeNull();
    expect(s.ohi.TL.growth).not.toBeNull();
    expect(s.ohi.TL.safety).not.toBeNull();
    expect(s.ohi.riskIndex).toBeTypeOf("number");
    for (const code of ["SL", "SV", "PS", "EM", "PM", "LG", "CI", "WE", "C"] as const) {
      expect(s.ohi.drivers[code]?.current, code).not.toBeNull();
    }

    expect(s.ori.ORI).not.toBeNull();
    expect(s.ori.opportunity.oppScore).not.toBeNull();
    expect(s.ovi.OVI).not.toBeNull();
    expect(s.ovi.HV).not.toBeNull();
    expect(s.ovi.CV).not.toBeNull();
    expect(s.ovi.AV).not.toBeNull();
    expect(s.ovi.dynamicCongruenceGap).toBeCloseTo(0, 5);
    expect(s.oai.OAI).not.toBeNull();
    expect(s.oai.SA).not.toBeNull();
    expect(s.oai.EA).not.toBeNull();
    expect(s.oai.OA).not.toBeNull();
    expect(s.oaiPattern).toBeTruthy();
  });

  it("flags risk when SEC03 and energy are low", () => {
    const { answers, reversed } = answersFromSeed(4);
    answers.SEC03 = { current: 2 };
    answers.E01 = { current: 2 };
    answers.E02 = { current: 2 };
    answers.HV01 = { current: 2 };
    answers.HV02 = { current: 2 };
    const s = computeArcScoresFromAnswers(answers, reversed);
    expect(s.ohi.riskIndex).toBeGreaterThan(0.5);
  });
});

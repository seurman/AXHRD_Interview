import { describe, expect, it } from "vitest";
import {
  buildReversedSet,
  computeArcScoresFromAnswers,
  computeDriverImportance,
  computeIcc1,
  olsRegression,
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

describe("olsRegression", () => {
  it("recovers known coefficients from a noiseless linear relationship", () => {
    // y = 2 + 3*x1 - 1*x2
    const X = [
      [1, 1],
      [2, 1],
      [3, 2],
      [4, 2],
      [5, 3],
      [1, 3],
      [2, 4],
      [6, 1],
    ];
    const y = X.map(([x1, x2]) => 2 + 3 * x1 - 1 * x2);
    const result = olsRegression(X, y);
    expect(result).not.toBeNull();
    expect(result!.coefficients[0]).toBeCloseTo(2, 5);
    expect(result!.coefficients[1]).toBeCloseTo(3, 5);
    expect(result!.coefficients[2]).toBeCloseTo(-1, 5);
    expect(result!.rSquared).toBeCloseTo(1, 5);
  });

  it("returns null for degenerate input", () => {
    expect(olsRegression([], [])).toBeNull();
  });
});

describe("computeDriverImportance", () => {
  it("flags insufficient data when sample is too small relative to predictor count", () => {
    const perRespondent = Array.from({ length: 5 }, () => ({
      ohi: {
        SE: 3.5,
        drivers: Object.fromEntries(
          ["D", "SL", "SV", "PS", "EM", "PM", "LG", "CI", "WE", "C"].map((c) => [c, { current: 3 }]),
        ),
      },
    }));
    const result = computeDriverImportance(perRespondent);
    expect(result.insufficientData).toBe(true);
    expect(result.entries.every((e) => e.beta == null)).toBe(true);
  });

  it("computes standardized betas with enough respondents", () => {
    // 결정론적 PRNG — 드라이버 간 인위적 공선성 없이 독립적인 값 생성
    function mulberry32(seed: number) {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(42);
    const codes = ["D", "SL", "SV", "PS", "EM", "PM", "LG", "CI", "WE", "C"];
    const perRespondent = Array.from({ length: 60 }, () => {
      const driverValues = codes.map(() => 1 + rand() * 4);
      const drivers = Object.fromEntries(codes.map((c, j) => [c, { current: driverValues[j] }]));
      // SE 는 PS(심리적안전)에 강하게 의존하도록 구성, 나머지는 잡음 수준만 기여
      const psVal = driverValues[codes.indexOf("PS")];
      const SE = Math.min(5, Math.max(1, 1 + 0.7 * psVal + (rand() - 0.5) * 0.3));
      return { ohi: { SE, drivers } };
    });
    const result = computeDriverImportance(perRespondent);
    expect(result.insufficientData).toBe(false);
    const psEntry = result.entries.find((e) => e.code === "PS");
    expect(psEntry?.beta).not.toBeNull();
    expect(psEntry!.beta!).toBeGreaterThan(0.8);
    const others = result.entries.filter((e) => e.code !== "PS");
    for (const o of others) {
      expect(Math.abs(o.beta ?? 0)).toBeLessThan(psEntry!.beta!);
    }
  });
});

describe("computeIcc1", () => {
  it("returns high ICC when between-team variance dominates", () => {
    const groups = [
      [4.8, 4.9, 5.0, 4.7],
      [2.0, 2.1, 1.9, 2.2],
      [3.5, 3.4, 3.6, 3.5],
    ];
    const result = computeIcc1(groups);
    expect(result.icc).not.toBeNull();
    expect(result.icc!).toBeGreaterThan(0.5);
  });

  it("returns low ICC when teams are indistinguishable", () => {
    const groups = [
      [3.0, 4.0, 2.0, 5.0],
      [2.5, 4.5, 3.0, 3.5],
      [3.5, 2.5, 4.0, 3.0],
    ];
    const result = computeIcc1(groups);
    expect(result.icc).not.toBeNull();
    expect(result.icc!).toBeLessThan(0.3);
  });

  it("returns null with fewer than 2 valid groups", () => {
    const result = computeIcc1([[1, 2, 3]]);
    expect(result.icc).toBeNull();
  });
});

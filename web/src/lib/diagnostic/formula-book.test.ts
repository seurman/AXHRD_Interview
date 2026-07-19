import { describe, expect, it } from "vitest";
import {
  computeOaiPattern,
  computeQuietCrackingIndex,
  computeTeamGapMatrix,
  IPA_BETA_FOCUS_THRESHOLD,
  type ScoredAnswers,
} from "@/lib/diagnostic/arc-scoring";
import { projectGoldenTimeFromSeries } from "@/lib/diagnostic/longitudinal";

describe("formula-book alignments", () => {
  it("exposes IPA β focus threshold of 0.25", () => {
    expect(IPA_BETA_FOCUS_THRESHOLD).toBe(0.25);
  });

  it("detects 건강한 표류 pattern (OHI↑ OVI↓ OAI↓)", () => {
    const pattern = computeOaiPattern(4.0, 3.0, 3.0, 3.0);
    expect(pattern?.pattern).toBe("건강한 표류");
  });

  it("computes Quiet Cracking Index from continuous formula", () => {
    const answers: ScoredAnswers = {
      SEC03: { current: 2 },
    };
    const qci = computeQuietCrackingIndex(answers, new Set(), 2.0, 4.0);
    // (6-2)*0.4 + (6-2)*0.3 + max(0,4-3)*0.3 = 1.6 + 1.2 + 0.3 = 3.1
    expect(qci).toBeCloseTo(3.1, 5);
  });

  it("runs OLS residual mode for 15+ teams", () => {
    const teams = Array.from({ length: 16 }, (_, i) => ({
      teamId: `t${i}`,
      teamName: `팀${i}`,
      ORI: 2 + (i % 5) * 0.4,
      OVI: 2.2 + (i % 5) * 0.35 + (i % 3) * 0.1,
      OHI_SE: i % 2 === 0 ? 2.8 : 4.0,
      OAI: i % 4 === 0 ? 2.5 : 3.8,
    }));
    const result = computeTeamGapMatrix(teams);
    expect(result.mode).toBe("OLS_RESIDUAL");
    if (result.mode === "OLS_RESIDUAL") {
      expect(result.n).toBe(16);
      expect(result.teams.some((t) => t.priorityManage)).toBe(true);
      expect(result.teams.every((t) => t.residual != null)).toBe(true);
    }
  });

  it("classifies GAP_MATRIX typology and marks Gap² TOP3 priority", () => {
    const teams = [
      { teamId: "a", teamName: "A", ORI: 2.0, OVI: 4.0, OHI_SE: 2.5, OAI: 3.5 }, // POSITIVE + low OHI → CRASH
      { teamId: "b", teamName: "B", ORI: 2.1, OVI: 3.8, OHI_SE: 4.0, OAI: 3.5 }, // POSITIVE + high OHI → SUPER_STAR
      { teamId: "c", teamName: "C", ORI: 4.0, OVI: 2.0, OHI_SE: 2.5, OAI: 3.5 }, // NEGATIVE + low OHI → APATHY
      { teamId: "d", teamName: "D", ORI: 3.9, OVI: 2.1, OHI_SE: 4.0, OAI: 3.5 }, // NEGATIVE + high OHI → CARTEL
      { teamId: "e", teamName: "E", ORI: 3.0, OVI: 3.0, OHI_SE: 3.5, OAI: 3.5 }, // near mean
      { teamId: "f", teamName: "F", ORI: 3.2, OVI: 3.1, OHI_SE: 3.5, OAI: 3.5 },
    ];
    const result = computeTeamGapMatrix(teams);
    expect(result.mode).toBe("GAP_MATRIX");
    if (result.mode !== "GAP_MATRIX") return;
    const byId = Object.fromEntries(result.teams.map((t) => [t.teamId, t]));
    expect(byId.a.typology).toBe("CRASH");
    expect(byId.b.typology).toBe("SUPER_STAR");
    expect(byId.c.typology).toBe("APATHY");
    expect(byId.d.typology).toBe("CARTEL");
    const prioritized = result.teams.filter((t) => t.priorityManage);
    expect(prioritized).toHaveLength(3);
  });

  it("projects golden-time horizons from a 3-wave series", () => {
    const forecast = projectGoldenTimeFromSeries({
      points: [
        { waveNumber: 1, monthsFromStart: 0, scores: { OHI: 3.0, ORI: 3.0, OVI: 3.0, OAI: 3.0 } },
        { waveNumber: 2, monthsFromStart: 6, scores: { OHI: 3.2, ORI: 3.1, OVI: 3.0, OAI: 3.2 } },
        { waveNumber: 3, monthsFromStart: 12, scores: { OHI: 3.4, ORI: 3.2, OVI: 3.1, OAI: 3.4 } },
      ],
    });
    expect(forecast.available).toBe(true);
    const ohi = forecast.axes.find((a) => a.axis === "OHI");
    expect(ohi?.projections.find((p) => p.months === 6)?.projected).not.toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { COMPETENCY_CODES } from "@/types";
import {
  buildTripleLexiconHints,
  getLexicon,
  getLexiconEntry,
  listAllLexiconCodes,
  listLexiconClusters,
  listLexiconTerms,
  ORG_LENSES,
} from "./lexicon";
import { lexiconOrgLensChoices } from "@/lib/competency-game/catalog/lexicon-banks";
import { isLongestCorrect } from "@/lib/competency-game/catalog/content-shuffle";

describe("competency lexicon", () => {
  it("covers all six runtime competencies with terms and rubrics", () => {
    for (const code of COMPETENCY_CODES) {
      const lex = getLexicon(code);
      expect(lex.terms.length).toBeGreaterThanOrEqual(4);
      expect(lex.ncsAnchor).toMatch(/NCS|직무/);
      expect(lex.definition.length).toBeGreaterThan(10);
      expect(lex.clusterCode).toBe("LEX_IRT_CORE");
      for (const lv of ["1", "2", "3", "4", "5"]) {
        expect(lex.rubricByLevel[lv]?.length).toBeGreaterThan(0);
      }
      for (const lens of ORG_LENSES) {
        expect(lex.lensSignals[lens].length).toBeGreaterThan(0);
      }
    }
  });

  it("ships an expanded multi-cluster dictionary for Framework Studio", () => {
    const codes = listAllLexiconCodes();
    expect(codes.length).toBeGreaterThanOrEqual(30);
    const clusters = listLexiconClusters();
    expect(clusters.length).toBeGreaterThanOrEqual(5);
    for (const code of codes) {
      const entry = getLexiconEntry(code);
      expect(entry, code).toBeTruthy();
      expect(entry!.definition.length).toBeGreaterThan(8);
      for (const lv of ["1", "2", "3", "4", "5"]) {
        expect(entry!.rubricByLevel[lv]?.length, `${code} L${lv}`).toBeGreaterThan(0);
      }
      expect(entry!.terms.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("builds triple-feedback lexicon hints", () => {
    const hints = buildTripleLexiconHints("LEADERSHIP");
    expect(hints).toContain("LARGE");
    expect(hints).toContain("PUBLIC");
    expect(hints).toContain("STARTUP");
  });

  it("org-lens game choices are not uniquely longest-correct", () => {
    for (const code of COMPETENCY_CODES) {
      for (const item of lexiconOrgLensChoices(code)) {
        expect(
          isLongestCorrect(item.choices, item.answerIndex),
          `${code}: ${item.prompt}`,
        ).toBe(false);
      }
    }
  });

  it("exposes vocabulary terms for learning meta", () => {
    const terms = listLexiconTerms("COMMUNICATION").map((t) => t.termKo);
    expect(terms).toContain("결론 먼저");
  });
});

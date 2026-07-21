/**
 * 역량 단어장(SSoT) — NCS·역량사전 관행의 신호어/숙어
 * 게임·학습·면접 트리플 렌즈가 동일 소스를 참조
 */

import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";
import raw from "@/data/competency/competency-lexicon.json";

export type OrgLens = "LARGE" | "PUBLIC" | "STARTUP";

export type LexiconTerm = {
  id: string;
  kind: "word" | "phrase";
  termKo: string;
  meaningKo: string;
  goodExample: string;
  badExample: string;
  preferredBy: OrgLens[];
};

export type LexiconCompetency = {
  nameKo: string;
  ncsAnchor: string;
  definition: string;
  subskills: Array<{ code: string; nameKo: string; ncs: string }>;
  terms: LexiconTerm[];
  lensSignals: Record<OrgLens, string[]>;
};

export type CompetencyLexiconDoc = {
  version: number;
  description: string;
  sources: string[];
  orgLenses: Record<OrgLens, { labelKo: string; looksFor: string[] }>;
  competencies: Record<string, LexiconCompetency>;
};

const DOC = raw as CompetencyLexiconDoc;

export const ORG_LENSES: OrgLens[] = ["LARGE", "PUBLIC", "STARTUP"];

export function getLexiconDoc(): CompetencyLexiconDoc {
  return DOC;
}

export function getLexicon(competency: CompetencyCode): LexiconCompetency {
  const entry = DOC.competencies[competency];
  if (!entry) {
    throw new Error(`lexicon missing for ${competency}`);
  }
  return entry;
}

export function listLexiconTerms(competency: CompetencyCode): LexiconTerm[] {
  return getLexicon(competency).terms;
}

export function getLensSignals(
  competency: CompetencyCode,
  lens: OrgLens,
): string[] {
  return getLexicon(competency).lensSignals[lens] ?? [];
}

export function getOrgLensMeta(lens: OrgLens) {
  return DOC.orgLenses[lens];
}

/** 면접 트리플 프롬프트에 넣을 역량×렌즈 신호 요약 */
export function buildTripleLexiconHints(competency: string): string {
  if (!COMPETENCY_CODES.includes(competency as CompetencyCode)) {
    return "";
  }
  const code = competency as CompetencyCode;
  const lex = getLexicon(code);
  return ORG_LENSES.map((lens) => {
    const meta = getOrgLensMeta(lens);
    const signals = lex.lensSignals[lens].join("·");
    const terms = lex.terms
      .filter((t) => t.preferredBy.includes(lens))
      .slice(0, 3)
      .map((t) => t.termKo)
      .join(", ");
    return `${lens}(${meta.labelKo}): looksFor=[${meta.looksFor.slice(0, 3).join(", ")}] signals=[${signals}] keyTerms=[${terms}]`;
  }).join("\n");
}

export function allLexiconCompetencies(): CompetencyCode[] {
  return COMPETENCY_CODES.filter((c) => Boolean(DOC.competencies[c]));
}

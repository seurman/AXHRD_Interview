/**
 * 역량 사전(SSoT) — 정의 · L1–L5 루브릭 · 신호어/숙어
 * Framework Studio · 게임 · 학습 · 면접 트리플 렌즈가 동일 소스 참조
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

export type LexiconRubricByLevel = Record<string, string[]>;

export type LexiconCompetency = {
  nameKo: string;
  nameEn?: string;
  clusterCode: string;
  ncsAnchor: string;
  definition: string;
  rubricByLevel: LexiconRubricByLevel;
  subskills: Array<{ code: string; nameKo: string; ncs: string }>;
  terms: LexiconTerm[];
  lensSignals: Record<OrgLens, string[]>;
};

export type LexiconClusterMeta = {
  code: string;
  nameKo: string;
  nameEn?: string;
  description?: string;
  sortOrder?: number;
};

export type CompetencyLexiconDoc = {
  version: number;
  description: string;
  sources: string[];
  orgLenses: Record<OrgLens, { labelKo: string; looksFor: string[] }>;
  clusters: LexiconClusterMeta[];
  competencies: Record<string, LexiconCompetency>;
};

const DOC = raw as CompetencyLexiconDoc;

export const ORG_LENSES: OrgLens[] = ["LARGE", "PUBLIC", "STARTUP"];

export function getLexiconDoc(): CompetencyLexiconDoc {
  return DOC;
}

export function listLexiconClusters(): LexiconClusterMeta[] {
  return [...(DOC.clusters ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
}

/** 사전 전체 역량 코드 (런타임 6개 포함) */
export function listAllLexiconCodes(): string[] {
  return Object.keys(DOC.competencies);
}

export function getLexiconEntry(code: string): LexiconCompetency | null {
  return DOC.competencies[code] ?? null;
}

/** 런타임 6역량 — 게임/학습 전용 (없으면 throw) */
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

export function lexiconRubricFor(code: string): LexiconRubricByLevel | null {
  return getLexiconEntry(code)?.rubricByLevel ?? null;
}

import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

export type MeaningGraphCompetencyScore = {
  code: CompetencyCode;
  label: string;
  score: number;
  matchedSignals: string[];
};

export type MeaningJdMatchInput = {
  jdText: string;
  extraTerms?: string[];
  industryCode?: string | null;
  jobRoleCode?: string | null;
};

const CACHE_TTL_MS = 60_000;

type GraphContext = {
  mapsTo: Array<{ fromKey: string; toKey: string; weight: number; note: string | null }>;
  contextualizes: Array<{ fromKey: string; toKey: string; weight: number; note: string | null }>;
  globals: Array<{ code: string; nameKo: string; nameEn: string; definition: string }>;
  mapNotesByGlobal: Map<string, string[]>;
};

let graphCache: { at: number; data: GraphContext } | null = null;

const NCS_ALIASES: Record<CompetencyCode, string[]> = {
  COMMUNICATION: ["의사소통", "커뮤니케이션", "소통", "전달", "경청", "설득"],
  PROBLEM_SOLVING: ["문제해결", "분석", "논리", "사고", "문제 해결", "문제정의"],
  JOB_FIT: ["직무", "전문성", "실무", "업무역량", "직무전문성", "직무 역량"],
  ORG_FIT: ["조직", "협업", "문화", "적합", "조직적합", "팀워크"],
  LEADERSHIP: ["리더십", "리드", "주도", "이끌", "팀장", "관리"],
  GROWTH: ["성장", "학습", "발전", "자기계발", "도전", "적응"],
};

export function tokenizeJdTerms(text: string, extra: string[] = []): string[] {
  const raw = `${text}\n${extra.join(" ")}`;
  const tokens = new Set<string>();

  for (const part of raw.split(/[\s,./|·•\-–—()[\]{}:;!?'"“”‘’]+/)) {
    const t = part.trim().toLowerCase();
    if (t.length >= 2) tokens.add(t);
  }

  for (const phrase of extra) {
    const p = phrase.trim();
    if (p.length >= 2) tokens.add(p.toLowerCase());
  }

  return [...tokens];
}

export function findSubstringHits(haystack: string, needles: string[]): string[] {
  const lower = haystack.toLowerCase();
  const hits: string[] = [];
  for (const needle of needles) {
    const n = needle.trim().toLowerCase();
    if (n.length >= 2 && lower.includes(n)) hits.push(needle);
  }
  return hits;
}

function haystackIncludes(haystack: string, term: string): boolean {
  if (term.length < 2) return false;
  return haystack.includes(term);
}

function scoreTextAgainstTerms(haystack: string, terms: string[]): { score: number; hits: string[] } {
  const lower = haystack.toLowerCase();
  let score = 0;
  const hits: string[] = [];
  for (const term of terms) {
    if (haystackIncludes(lower, term)) {
      score += term.length >= 4 ? 1.2 : 0.8;
      hits.push(term);
    }
  }
  return { score, hits };
}

async function loadGraphContext(): Promise<GraphContext> {
  const now = Date.now();
  if (graphCache && now - graphCache.at < CACHE_TTL_MS) return graphCache.data;

  const [mapsToRows, contextualRows, globals] = await Promise.all([
    prisma.conceptRelation.findMany({
      where: { isActive: true, edgeType: "MAPS_TO" },
      select: { fromKey: true, toKey: true, weight: true, note: true },
    }),
    prisma.conceptRelation.findMany({
      where: { isActive: true, edgeType: "CONTEXTUALIZES" },
      select: { fromKey: true, toKey: true, weight: true, note: true },
    }),
    prisma.globalCompetency.findMany({
      where: { isActive: true },
      select: { code: true, nameKo: true, nameEn: true, definition: true },
    }),
  ]);

  const mapNotesByGlobal = new Map<string, string[]>();
  for (const row of mapsToRows) {
    if (!row.note) continue;
    const list = mapNotesByGlobal.get(row.toKey) ?? [];
    list.push(row.note);
    mapNotesByGlobal.set(row.toKey, list);
  }

  const data: GraphContext = {
    mapsTo: mapsToRows,
    contextualizes: contextualRows,
    globals,
    mapNotesByGlobal,
  };
  graphCache = { at: now, data };
  return data;
}

function contextKeys(industryCode?: string | null, jobRoleCode?: string | null): string[] {
  const keys: string[] = [];
  if (industryCode) keys.push(`INDUSTRY:${industryCode}`);
  if (jobRoleCode) keys.push(`ROLE:${jobRoleCode}`);
  if (industryCode && jobRoleCode) keys.push(`COMBO:${industryCode}:${jobRoleCode}`);
  return keys;
}

function keywordContextKeys(terms: string[]): string[] {
  const keys: string[] = [];
  for (const term of terms) {
    if (term.length >= 2) keys.push(`KEYWORD:${term}`);
  }
  return keys;
}

export async function scoreJdWithMeaningGraph(
  input: MeaningJdMatchInput,
): Promise<MeaningGraphCompetencyScore[]> {
  const fullText = `${input.jdText}\n${(input.extraTerms ?? []).join(" ")}`;
  const terms = tokenizeJdTerms(input.jdText, input.extraTerms ?? []);
  if (terms.length === 0 && fullText.trim().length < 2) return [];

  let ctx: GraphContext;
  try {
    ctx = await loadGraphContext();
  } catch {
    return scoreJdWithAliasesOnly(terms, fullText);
  }

  const ncsScores = new Map<CompetencyCode, { score: number; signals: Set<string> }>();
  for (const code of COMPETENCY_CODES) {
    ncsScores.set(code, { score: 0, signals: new Set() });
  }

  for (const code of COMPETENCY_CODES) {
    const label = competencyLabel(code);
    const aliases = NCS_ALIASES[code];
    const { score, hits } = scoreTextAgainstTerms(
      [label, code, ...aliases].join(" "),
      terms,
    );
    const subHits = findSubstringHits(fullText, [label, ...aliases]);
    const total = score + subHits.length * 1.1;
    if (total > 0) {
      const row = ncsScores.get(code)!;
      row.score += total;
      hits.forEach((h) => row.signals.add(`ncs:${h}`));
      subHits.forEach((h) => row.signals.add(`phrase:${h}`));
    }
  }

  const globalScores = new Map<string, number>();
  for (const g of ctx.globals) {
    const notes = ctx.mapNotesByGlobal.get(g.code) ?? [];
    const haystack = [g.nameKo, g.nameEn, g.code, g.definition, ...notes].join(" ");
    const { score, hits } = scoreTextAgainstTerms(haystack, terms);
    const subHits = findSubstringHits(fullText, [g.nameKo, g.nameEn, g.code]);
    const total = score + subHits.length;
    if (total > 0) {
      globalScores.set(g.code, score);
      for (const map of ctx.mapsTo) {
        if (map.toKey !== g.code) continue;
        const ncs = map.fromKey as CompetencyCode;
        if (!COMPETENCY_CODES.includes(ncs)) continue;
        const row = ncsScores.get(ncs)!;
        const added = total * map.weight;
        row.score += added;
        row.signals.add(`global:${g.nameKo}(w=${map.weight.toFixed(1)})`);
        [...hits.slice(0, 2), ...subHits.slice(0, 1)].forEach((h) => row.signals.add(`term:${h}`));
      }
    }
  }

  const ctxKeys = [
    ...contextKeys(input.industryCode, input.jobRoleCode),
    ...keywordContextKeys(terms),
  ];
  for (const key of ctxKeys) {
    for (const edge of ctx.contextualizes) {
      if (edge.fromKey !== key) continue;
      const ncs = edge.toKey as CompetencyCode;
      if (!COMPETENCY_CODES.includes(ncs)) continue;
      const row = ncsScores.get(ncs)!;
      row.score += edge.weight;
      row.signals.add(`context:${key}`);
    }
  }

  return COMPETENCY_CODES.map((code) => {
    const row = ncsScores.get(code)!;
    return {
      code,
      label: competencyLabel(code),
      score: Math.round(row.score * 100) / 100,
      matchedSignals: [...row.signals].slice(0, 6),
    };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function scoreJdWithAliasesOnly(terms: string[], fullText: string): MeaningGraphCompetencyScore[] {
  return COMPETENCY_CODES.map((code) => {
    const aliases = [competencyLabel(code), ...NCS_ALIASES[code]];
    const { score, hits } = scoreTextAgainstTerms(aliases.join(" "), terms);
    const subHits = findSubstringHits(fullText, aliases);
    const total = score + subHits.length * 1.1;
    return {
      code,
      label: competencyLabel(code),
      score: Math.round(total * 100) / 100,
      matchedSignals: [...hits.map((h) => `ncs:${h}`), ...subHits.map((h) => `phrase:${h}`)],
    };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function pickGraphRecommendation(
  scores: MeaningGraphCompetencyScore[],
): { code: CompetencyCode; rationale: string } | null {
  if (scores.length === 0) return null;
  const top = scores[0];
  const second = scores[1];
  const minScore = 0.35;
  const gapOk = !second || top.score >= second.score * 1.25;
  if (top.score < minScore || !gapOk) return null;

  const signals = top.matchedSignals.slice(0, 3).join(", ");
  return {
    code: top.code,
    rationale: `Meaning Layer 그래프가 ${top.label} 역량을 가장 높게 평가했습니다.${signals ? ` (${signals})` : ""}`,
  };
}

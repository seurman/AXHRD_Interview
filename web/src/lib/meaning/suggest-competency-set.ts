import type { CompetencyCode } from "@/types";
import { COMPETENCY_CODES } from "@/types";
import type { MeaningGraphCompetencyScore } from "@/lib/meaning/jd-competency-match";
import type { PrepMode } from "@/lib/interview/competency-round";

export function buildRecommendedCompetencySet(
  meaningGraphScores: MeaningGraphCompetencyScore[],
  topCompetency: CompetencyCode | null,
  maxCount = 4,
): CompetencyCode[] {
  const codes: CompetencyCode[] = [];
  if (topCompetency && COMPETENCY_CODES.includes(topCompetency)) {
    codes.push(topCompetency);
  }
  for (const row of meaningGraphScores) {
    if (!COMPETENCY_CODES.includes(row.code)) continue;
    if (!codes.includes(row.code)) codes.push(row.code);
    if (codes.length >= maxCount) break;
  }
  return codes;
}

export function suggestCompetencySet(params: {
  prepMode: PrepMode;
  personaFocus: readonly CompetencyCode[];
  meaningGraphScores: MeaningGraphCompetencyScore[];
  topCompetency?: CompetencyCode | null;
  completedCompetencies?: string[];
  maxCount?: number;
}): CompetencyCode[] {
  const max = params.maxCount ?? 4;
  const completed = new Set(params.completedCompetencies ?? []);
  const skipCompleted = (codes: CompetencyCode[]) =>
    codes.filter((c) => !completed.has(c));

  if (params.prepMode === "COMPANY_TARGET") {
    const fromGraph = buildRecommendedCompetencySet(
      params.meaningGraphScores,
      params.topCompetency ?? null,
      max,
    ).filter((c) => !completed.has(c));

    if (fromGraph.length >= 2) return fromGraph.slice(0, max);

    const persona = skipCompleted(params.personaFocus as CompetencyCode[]);
    const merged = [...fromGraph];
    for (const code of persona) {
      if (!merged.includes(code)) merged.push(code);
      if (merged.length >= max) break;
    }
    return merged.slice(0, max);
  }

  const persona = skipCompleted(params.personaFocus as CompetencyCode[]);
  if (persona.length >= 2) return persona.slice(0, max);

  const rest = skipCompleted([...COMPETENCY_CODES] as CompetencyCode[]).filter(
    (c) => !persona.includes(c),
  );
  return [...persona, ...rest].slice(0, max);
}

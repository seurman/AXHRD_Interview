import {
  COMPETENCY_TO_QUADSCOPE,
  QUADSCOPE_IDS,
  QUADSCOPE_SCOPES,
  type QuadScopeId,
} from "./scopes";

export type ScopeRollup = {
  id: QuadScopeId;
  nameEn: string;
  nameKo: string;
  /** 0–100 percentile average when assessed; null if no data */
  percentile: number | null;
  assessedCount: number;
  competencyCodes: string[];
};

type CompetencyLatestLike = {
  percentile?: number;
  assessed?: boolean;
};

/** Roll IRT competency snapshots up into QuadScope bars */
export function rollupQuadScope(
  latestByCompetency: Record<string, CompetencyLatestLike>,
): ScopeRollup[] {
  const buckets: Record<QuadScopeId, { sum: number; n: number; codes: string[] }> = {
    judgment: { sum: 0, n: 0, codes: [] },
    delivery: { sum: 0, n: 0, codes: [] },
    relations: { sum: 0, n: 0, codes: [] },
    anchor: { sum: 0, n: 0, codes: [] },
  };

  for (const [code, row] of Object.entries(latestByCompetency)) {
    const scope = COMPETENCY_TO_QUADSCOPE[code];
    if (!scope) continue;
    buckets[scope].codes.push(code);
    if (row?.assessed && typeof row.percentile === "number") {
      buckets[scope].sum += row.percentile;
      buckets[scope].n += 1;
    }
  }

  return QUADSCOPE_IDS.map((id) => {
    const def = QUADSCOPE_SCOPES.find((s) => s.id === id)!;
    const b = buckets[id];
    return {
      id,
      nameEn: def.nameEn,
      nameKo: def.nameKo,
      percentile: b.n > 0 ? Math.round(b.sum / b.n) : null,
      assessedCount: b.n,
      competencyCodes: b.codes,
    };
  });
}

/**
 * 자소서 온톨로지 소비 API — Postgres evidence + (옵션) Neo4j + 면접 답변 수준.
 */

import { prisma } from "@/lib/prisma";
import {
  ensureResumeEvidence,
  rankEvidenceForCompetency,
  type CompetencyPerformance,
  type ResumeEvidenceClaim,
} from "@/lib/interview/resume-evidence";
import type { ResumeSummary } from "@/lib/interview/resume-summary";
import {
  mergeGraphHitsIntoEvidence,
  queryClaimsForCompetency,
  syncResumeEvidenceGraph,
} from "@/lib/neo4j/resume-evidence-graph";

export async function persistResumeOntology(params: {
  userId: string;
  resumeId: string;
  summary: ResumeSummary;
}): Promise<ResumeSummary> {
  const summary = ensureResumeEvidence(params.summary);
  // Neo4j 미러 — 실패해도 무시
  void syncResumeEvidenceGraph({
    userId: params.userId,
    resumeId: params.resumeId,
    summary,
  });
  return summary;
}

export async function loadCompetencyPerformance(
  userId: string,
  competency?: string,
): Promise<CompetencyPerformance[]> {
  const rows = await prisma.competencyProgress.findMany({
    where: {
      userId,
      ...(competency ? { competency } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });
  const byCode = new Map<string, CompetencyPerformance>();
  for (const r of rows) {
    if (byCode.has(r.competency)) continue;
    byCode.set(r.competency, {
      code: r.competency,
      theta: r.latestTheta,
      levelEst: r.levelEst,
      percentile: r.percentile,
      status: r.status,
    });
  }
  return [...byCode.values()];
}

export async function resolveEvidenceForCompetency(params: {
  userId: string;
  resumeId?: string | null;
  summary: ResumeSummary | null | undefined;
  competency: string;
}): Promise<{
  claims: ResumeEvidenceClaim[];
  performance: CompetencyPerformance | null;
  experiences: string[];
  chunkTexts: Array<{ title: string; markdown: string; tags?: string[] }>;
}> {
  const summary = params.summary ? ensureResumeEvidence(params.summary) : null;
  let evidence = summary?.evidence ?? [];

  const [graphHits, performances] = await Promise.all([
    queryClaimsForCompetency({
      userId: params.userId,
      resumeId: params.resumeId,
      competency: params.competency,
      limit: 8,
    }),
    loadCompetencyPerformance(params.userId, params.competency),
  ]);

  if (graphHits.length) {
    evidence = mergeGraphHitsIntoEvidence(evidence, graphHits);
  }

  const performance = performances.find((p) => p.code === params.competency) ?? null;
  const ranked = rankEvidenceForCompetency(evidence, params.competency, performance);

  return {
    claims: ranked,
    performance,
    experiences: ranked.map((c) => c.text),
    chunkTexts: ranked.map((c) => ({
      title: c.title,
      markdown: c.text,
      tags: c.competencies.map((x) => x.code),
    })),
  };
}

export function pickClaimIdsUsedInSession(params: {
  highlights?: string[];
  evidence?: ResumeEvidenceClaim[];
  claimVerificationClaim?: string | null;
}): string[] {
  const evidence = params.evidence ?? [];
  const ids = new Set<string>();
  const haystack = [
    ...(params.highlights ?? []),
    params.claimVerificationClaim ?? "",
  ].filter(Boolean);

  for (const e of evidence) {
    for (const h of haystack) {
      if (
        h.includes(e.text.slice(0, 40)) ||
        e.text.includes(h.slice(0, 40)) ||
        h.includes(e.title)
      ) {
        ids.add(e.claimId);
      }
    }
  }
  return [...ids];
}

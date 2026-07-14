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
import {
  enrichResumeWithLlm,
  interpretResume,
  interpretResumeFast,
  needsEnrichment,
} from "@/lib/interview/resume-interpret";
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
  void syncResumeEvidenceGraph({
    userId: params.userId,
    resumeId: params.resumeId,
    summary,
  });
  return summary;
}

/**
 * 새 자소서 유입용: 빠른 해석을 즉시 저장하고, LLM 보강은 요청 후처리로 올린다.
 * waitEnrichMs>0 이면 그 시간까지 보강을 기다린 뒤 저장(첨삭처럼 대기 가능한 경로).
 */
export async function ingestResumeInterpretation(params: {
  userId: string;
  resumeId: string;
  rawText: string;
  waitEnrichMs?: number;
  scheduleBackgroundEnrich?: boolean;
}): Promise<{ summary: ResumeSummary; usedEnrich: boolean; enrichScheduled: boolean }> {
  const wait = params.waitEnrichMs ?? 0;
  const { summary, usedEnrich } = await interpretResume({
    rawText: params.rawText,
    waitEnrichMs: wait,
  });

  await prisma.resume.update({
    where: { id: params.resumeId },
    data: { parsedTags: JSON.parse(JSON.stringify(summary)) },
  });
  await persistResumeOntology({
    userId: params.userId,
    resumeId: params.resumeId,
    summary,
  });

  let enrichScheduled = false;
  if (!usedEnrich && (params.scheduleBackgroundEnrich ?? true) && needsEnrichment(summary)) {
    enrichScheduled = scheduleResumeEnrichment({
      userId: params.userId,
      resumeId: params.resumeId,
      rawText: params.rawText,
      base: summary,
    });
  }

  return { summary, usedEnrich, enrichScheduled };
}

/** 요청 컨텍스트에서 after()로 LLM 보강 — 실패해도 질문/첨삭은 fast evidence로 충분 */
export function scheduleResumeEnrichment(params: {
  userId: string;
  resumeId: string;
  rawText: string;
  base?: ResumeSummary;
}): boolean {
  const run = async () => {
    try {
      const enriched =
        (await enrichResumeWithLlm(params.rawText, params.base ?? interpretResumeFast(params.rawText))) ??
        null;
      if (!enriched) return;
      await prisma.resume.update({
        where: { id: params.resumeId },
        data: { parsedTags: JSON.parse(JSON.stringify(enriched)) },
      });
      await persistResumeOntology({
        userId: params.userId,
        resumeId: params.resumeId,
        summary: enriched,
      });
    } catch (e) {
      console.warn("[resume-ontology] background enrich failed:", e);
    }
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { after } = require("next/server") as { after?: (fn: () => void | Promise<void>) => void };
    if (typeof after === "function") {
      after(() => {
        void run();
      });
      return true;
    }
  } catch {
    /* non-Next context */
  }
  void run();
  return true;
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

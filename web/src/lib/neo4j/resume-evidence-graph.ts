/**
 * 자소서 claim 온톨로지 — Neo4j 미러
 *
 * Candidate -[:HAS_RESUME]-> Resume -[:HAS_CLAIM]-> Claim -[:SUPPORTS]-> Competency
 * Candidate -[:DEMONSTRATED {claimId}]-> Competency (면접 답변 수준)
 */

import { runCypher, queryCypher } from "@/lib/neo4j/client";
import { ensureOntologySchema } from "@/lib/neo4j/ontology";
import type { ResumeEvidenceClaim } from "@/lib/interview/resume-evidence";
import type { ResumeSummary } from "@/lib/interview/resume-summary";
import { ensureResumeEvidence } from "@/lib/interview/resume-evidence";

export async function syncResumeEvidenceGraph(params: {
  userId: string;
  resumeId: string;
  summary: ResumeSummary;
}): Promise<void> {
  const summary = ensureResumeEvidence(params.summary);
  const evidence = summary.evidence ?? [];
  if (!evidence.length) return;

  try {
    await ensureOntologySchema();
    await runCypher(
      `
      MERGE (u:Candidate {id: $userId})
      MERGE (r:Resume {id: $resumeId})
      SET r.updatedAt = datetime(),
          r.claimCount = $claimCount,
          r.summaryPreview = $summaryPreview
      MERGE (u)-[:HAS_RESUME]->(r)
      WITH r
      OPTIONAL MATCH (r)-[:HAS_CLAIM]->(old:Claim)
      DETACH DELETE old
      `,
      {
        userId: params.userId,
        resumeId: params.resumeId,
        claimCount: evidence.length,
        summaryPreview: (summary.summary ?? "").slice(0, 200),
      },
    );

    for (const claim of evidence) {
      await runCypher(
        `
        MATCH (r:Resume {id: $resumeId})
        MERGE (c:Claim {id: $claimId})
        SET c.title = $title,
            c.text = $text,
            c.updatedAt = datetime()
        MERGE (r)-[:HAS_CLAIM]->(c)
        `,
        {
          resumeId: params.resumeId,
          claimId: claim.claimId,
          title: claim.title,
          text: claim.text.slice(0, 800),
        },
      );

      for (const link of claim.competencies) {
        await runCypher(
          `
          MATCH (c:Claim {id: $claimId}), (comp:Competency {code: $code})
          MERGE (c)-[s:SUPPORTS]->(comp)
          SET s.score = $score, s.updatedAt = datetime()
          `,
          {
            claimId: claim.claimId,
            code: link.code,
            score: link.score,
          },
        );
      }
    }
  } catch (e) {
    console.warn("[Neo4j] syncResumeEvidenceGraph failed:", e);
  }
}

export async function syncClaimDemonstration(params: {
  userId: string;
  resumeId?: string | null;
  competency: string;
  claimIds: string[];
  sessionId: string;
  theta?: number | null;
  levelEst?: number | null;
  percentile?: number | null;
  rubricAvg?: number | null;
}): Promise<void> {
  if (!params.claimIds.length) return;
  try {
    for (const claimId of params.claimIds) {
      await runCypher(
        `
        MATCH (u:Candidate {id: $userId}), (comp:Competency {code: $competency})
        OPTIONAL MATCH (c:Claim {id: $claimId})
        MERGE (u)-[d:DEMONSTRATED {claimId: $claimId, competency: $competency}]->(comp)
        SET d.sessionId = $sessionId,
            d.theta = $theta,
            d.levelEst = $levelEst,
            d.percentile = $percentile,
            d.rubricAvg = $rubricAvg,
            d.updatedAt = datetime()
        WITH c, d
        WHERE c IS NOT NULL
        SET c.lastDemoTheta = $theta,
            c.lastDemoLevel = $levelEst,
            c.lastDemoAt = datetime()
        `,
        {
          userId: params.userId,
          competency: params.competency,
          claimId,
          sessionId: params.sessionId,
          theta: params.theta ?? null,
          levelEst: params.levelEst ?? null,
          percentile: params.percentile ?? null,
          rubricAvg: params.rubricAvg ?? null,
        },
      );
    }
  } catch (e) {
    console.warn("[Neo4j] syncClaimDemonstration failed:", e);
  }
}

export type GraphClaimHit = {
  claimId: string;
  title: string;
  text: string;
  supportScore: number;
  lastDemoLevel: number | null;
  lastDemoTheta: number | null;
};

/** 역량 기준 자소서 claim 조회 — Neo4j 없으면 빈 배열 */
export async function queryClaimsForCompetency(params: {
  userId: string;
  resumeId?: string | null;
  competency: string;
  limit?: number;
}): Promise<GraphClaimHit[]> {
  const limit = params.limit ?? 8;
  const rows = await queryCypher(
    `
    MATCH (u:Candidate {id: $userId})-[:HAS_RESUME]->(r:Resume)
    WHERE $resumeId IS NULL OR r.id = $resumeId
    MATCH (r)-[:HAS_CLAIM]->(c:Claim)-[s:SUPPORTS]->(comp:Competency {code: $competency})
    OPTIONAL MATCH (u)-[d:DEMONSTRATED {claimId: c.id, competency: $competency}]->(comp)
    RETURN c.id AS claimId,
           c.title AS title,
           c.text AS text,
           s.score AS supportScore,
           coalesce(d.levelEst, c.lastDemoLevel) AS lastDemoLevel,
           coalesce(d.theta, c.lastDemoTheta) AS lastDemoTheta
    ORDER BY supportScore DESC
    LIMIT toInteger($limit)
    `,
    {
      userId: params.userId,
      resumeId: params.resumeId ?? null,
      competency: params.competency,
      limit,
    },
  );

  return rows
    .map((row) => ({
      claimId: String(row.claimId ?? ""),
      title: String(row.title ?? ""),
      text: String(row.text ?? ""),
      supportScore: typeof row.supportScore === "number" ? row.supportScore : Number(row.supportScore) || 0,
      lastDemoLevel:
        row.lastDemoLevel == null
          ? null
          : typeof row.lastDemoLevel === "number"
            ? row.lastDemoLevel
            : Number(row.lastDemoLevel),
      lastDemoTheta:
        row.lastDemoTheta == null
          ? null
          : typeof row.lastDemoTheta === "number"
            ? row.lastDemoTheta
            : Number(row.lastDemoTheta),
    }))
    .filter((r) => r.claimId && r.text);
}

export function mergeGraphHitsIntoEvidence(
  evidence: ResumeEvidenceClaim[],
  hits: GraphClaimHit[],
): ResumeEvidenceClaim[] {
  if (!hits.length) return evidence;
  const byId = new Map(evidence.map((e) => [e.claimId, e]));
  for (const hit of hits) {
    if (!byId.has(hit.claimId)) {
      byId.set(hit.claimId, {
        claimId: hit.claimId,
        title: hit.title,
        text: hit.text,
        competencies: [{ code: "JOB_FIT", score: hit.supportScore }],
      });
    }
  }
  // graph 순위 반영: hit 순서 우선
  const ordered: ResumeEvidenceClaim[] = [];
  const used = new Set<string>();
  for (const hit of hits) {
    const e = byId.get(hit.claimId);
    if (e) {
      ordered.push(e);
      used.add(hit.claimId);
    }
  }
  for (const e of evidence) {
    if (!used.has(e.claimId)) ordered.push(e);
  }
  return ordered;
}

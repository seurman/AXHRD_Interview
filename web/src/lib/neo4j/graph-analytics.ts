/**
 * 그래프 확장 질의 — 역량 추천, JD↔claim 매칭, 후보 증거 탐색, 코호트 약점 집계.
 */

import { queryCypher } from "@/lib/neo4j/client";
import type { ResumeEvidenceClaim } from "@/lib/interview/resume-evidence";
import { evidenceGaps, performanceBand, type CompetencyPerformance } from "@/lib/interview/resume-evidence";
import { tokenizeJdTerms } from "@/lib/meaning/jd-competency-match";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";
import { competencyLabel } from "@/lib/labels";

/** REQUIRES 선행 + 미완료/약점 역량으로 다음 면접 역량 추천 */
export function recommendNextCompetencies(params: {
  performances: CompetencyPerformance[];
  evidence?: ResumeEvidenceClaim[];
  limit?: number;
}): Array<{ code: CompetencyCode; reason: string; priority: number }> {
  const limit = params.limit ?? 3;
  const byCode = new Map(params.performances.map((p) => [p.code, p]));
  const gaps = evidenceGaps(params.evidence ?? []);

  // 간단한 선행: 소통→문제해결→직무, 조직→리더십, 성장→소통
  const requires: Array<[CompetencyCode, CompetencyCode]> = [
    ["COMMUNICATION", "PROBLEM_SOLVING"],
    ["PROBLEM_SOLVING", "JOB_FIT"],
    ["ORG_FIT", "LEADERSHIP"],
    ["GROWTH", "COMMUNICATION"],
  ];

  const scored = COMPETENCY_CODES.map((code) => {
    const perf = byCode.get(code);
    const band = performanceBand(perf ?? null);
    const gap = gaps.find((g) => g.code === code)?.strength ?? 0;
    let priority = 0;
    const reasons: string[] = [];

    if (!perf || perf.status !== "COMPLETED") {
      priority += 2;
      reasons.push("미완료");
    }
    if (band === "weak") {
      priority += 3;
      reasons.push("면접 답변 약함");
    }
    if (gap < 0.4) {
      priority += 2;
      reasons.push("자소서 근거 부족");
    }
    // 선행이 완료됐으면 후속 역량 가산
    for (const [from, to] of requires) {
      if (to !== code) continue;
      const fromPerf = byCode.get(from);
      if (fromPerf?.status === "COMPLETED") {
        priority += 1.5;
        reasons.push(`${from} 완료 후 권장`);
      }
    }
    return {
      code,
      priority,
      reason: reasons.join(" · ") || "기본",
    };
  })
    .filter((r) => r.priority > 0)
    .sort((a, b) => b.priority - a.priority);

  return scored.slice(0, limit);
}

export type JdClaimMatch = {
  claimId: string;
  title: string;
  textPreview: string;
  matchedTerms: string[];
  score: number;
  competencies: CompetencyCode[];
};

/** JD 키워드와 자소서 claim 텍스트 매칭 — 그래프 SUPPORTS 없이도 Postgres evidence로 동작 */
export function matchClaimsToJd(params: {
  jdText: string;
  extraTerms?: string[];
  evidence: ResumeEvidenceClaim[];
  limit?: number;
}): JdClaimMatch[] {
  const terms = tokenizeJdTerms(params.jdText, params.extraTerms ?? []);
  if (!terms.length || !params.evidence.length) return [];

  const hits: JdClaimMatch[] = [];
  for (const e of params.evidence) {
    const hay = `${e.title} ${e.text}`.toLowerCase();
    const matched: string[] = [];
    let score = 0;
    for (const t of terms) {
      if (t.length >= 2 && hay.includes(t)) {
        matched.push(t);
        score += t.length >= 4 ? 1.2 : 0.7;
      }
    }
    // claim이 가리키는 역량도 약한 가산
    score += e.competencies.reduce((s, c) => s + c.score * 0.3, 0);
    if (matched.length === 0 && score < 0.5) continue;
    hits.push({
      claimId: e.claimId,
      title: e.title,
      textPreview: e.text.slice(0, 160),
      matchedTerms: [...new Set(matched)].slice(0, 8),
      score,
      competencies: e.competencies.map((c) => c.code),
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, params.limit ?? 8);
}

export type CandidateGraphView = {
  userId: string;
  resumeId: string | null;
  claims: Array<{
    claimId: string;
    title: string;
    text: string;
    supports: Array<{ code: string; score: number }>;
    demoLevel: number | null;
    demoTheta: number | null;
  }>;
  progress: Array<{
    code: string;
    status: string | null;
    theta: number | null;
    levelEst: number | null;
  }>;
};

/** Neo4j에서 후보 자소서 증거 그래프 조회 (없으면 빈 claims) */
export async function fetchCandidateGraphFromNeo4j(params: {
  userId: string;
  resumeId?: string | null;
}): Promise<CandidateGraphView> {
  const claimRows = await queryCypher(
    `
    MATCH (u:Candidate {id: $userId})-[:HAS_RESUME]->(r:Resume)
    WHERE $resumeId IS NULL OR r.id = $resumeId
    OPTIONAL MATCH (r)-[:HAS_CLAIM]->(c:Claim)
    OPTIONAL MATCH (c)-[s:SUPPORTS]->(comp:Competency)
    OPTIONAL MATCH (u)-[d:DEMONSTRATED {claimId: c.id}]->(comp)
    RETURN r.id AS resumeId,
           c.id AS claimId,
           c.title AS title,
           c.text AS text,
           collect(DISTINCT {code: comp.code, score: s.score, demoLevel: d.levelEst, demoTheta: d.theta}) AS links
    `,
    { userId: params.userId, resumeId: params.resumeId ?? null },
  );

  const progressRows = await queryCypher(
    `
    MATCH (u:Candidate {id: $userId})-[p:PROGRESS_ON]->(c:Competency)
    RETURN c.code AS code, p.status AS status, p.theta AS theta, p.levelEst AS levelEst
    `,
    { userId: params.userId },
  );

  const claims: CandidateGraphView["claims"] = [];
  let resumeId: string | null = null;
  for (const row of claimRows) {
    if (row.resumeId) resumeId = String(row.resumeId);
    const claimId = row.claimId ? String(row.claimId) : "";
    if (!claimId) continue;
    const links = Array.isArray(row.links) ? row.links : [];
    const supports: Array<{ code: string; score: number }> = [];
    let demoLevel: number | null = null;
    let demoTheta: number | null = null;
    for (const link of links) {
      if (!link || typeof link !== "object") continue;
      const L = link as Record<string, unknown>;
      if (typeof L.code === "string") {
        supports.push({
          code: L.code,
          score: typeof L.score === "number" ? L.score : Number(L.score) || 0,
        });
      }
      if (L.demoLevel != null && demoLevel == null) {
        demoLevel = typeof L.demoLevel === "number" ? L.demoLevel : Number(L.demoLevel);
      }
      if (L.demoTheta != null && demoTheta == null) {
        demoTheta = typeof L.demoTheta === "number" ? L.demoTheta : Number(L.demoTheta);
      }
    }
    claims.push({
      claimId,
      title: String(row.title ?? ""),
      text: String(row.text ?? ""),
      supports,
      demoLevel,
      demoTheta,
    });
  }

  return {
    userId: params.userId,
    resumeId,
    claims,
    progress: progressRows.map((r) => ({
      code: String(r.code ?? ""),
      status: r.status == null ? null : String(r.status),
      theta: r.theta == null ? null : Number(r.theta),
      levelEst: r.levelEst == null ? null : Number(r.levelEst),
    })),
  };
}

/** 코호트 진단용 — Neo4j에서 역량별 SUPPORT 대비 약한 DEMONSTRATED 비율 */
export async function fetchCohortWeakDemoStats(): Promise<
  Array<{ code: string; label: string; claimCount: number; weakDemoCount: number; ratio: number }>
> {
  const rows = await queryCypher(
    `
    MATCH (c:Claim)-[s:SUPPORTS]->(comp:Competency)
    WHERE s.score >= 0.35
    OPTIONAL MATCH (:Candidate)-[d:DEMONSTRATED {claimId: c.id, competency: comp.code}]->(comp)
    WITH comp.code AS code,
         count(c) AS claimCount,
         sum(CASE WHEN d IS NOT NULL AND coalesce(d.levelEst, 3) <= 2 THEN 1 ELSE 0 END) AS weakDemoCount
    RETURN code, claimCount, weakDemoCount
    ORDER BY weakDemoCount DESC
    `,
  );

  return rows
    .filter((r) => r.code)
    .map((r) => {
      const code = String(r.code);
      const claimCount = Number(r.claimCount) || 0;
      const weakDemoCount = Number(r.weakDemoCount) || 0;
      return {
        code,
        label: competencyLabel(code as CompetencyCode),
        claimCount,
        weakDemoCount,
        ratio: claimCount > 0 ? weakDemoCount / claimCount : 0,
      };
    });
}

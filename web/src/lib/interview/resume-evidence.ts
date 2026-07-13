/**
 * 자소서 claim(경험 청크) ↔ NCS 역량 매핑.
 * Postgres Resume.parsedTags.evidence 가 SSOT이고, Neo4j는 선택 미러.
 */

import type { ResumeChunk, ResumeSummary } from "@/lib/interview/resume-summary";
import { COMPETENCY_CODES, type CompetencyCode } from "@/types";

export type ClaimCompetencyScore = {
  code: CompetencyCode;
  score: number;
};

export type ResumeEvidenceClaim = {
  claimId: string;
  title: string;
  text: string;
  competencies: ClaimCompetencyScore[];
};

export type CompetencyPerformance = {
  code: string;
  theta?: number | null;
  levelEst?: number | null;
  percentile?: number | null;
  status?: string | null;
};

export type PerformanceBand = "weak" | "mid" | "strong" | "unknown";

const COMPETENCY_HINTS: Record<CompetencyCode, RegExp> = {
  COMMUNICATION: /발표|설득|전달|보고|협의|커뮤니|설명|소통|문서|프레젠|회의/,
  PROBLEM_SOLVING: /문제|해결|분석|개선|효율|원인|과제|난관|어려|장애|트러블|디버그/,
  JOB_FIT: /직무|업무|프로젝트|개발|마케|영업|실무|담당|성과|매출|기술|디자인|기획/,
  ORG_FIT: /팀|협업|조직|문화|동료|갈등|소속|함께|부서|이해관계/,
  LEADERSHIP: /리더|주도|이끌|장|대표|팀원|책임|주장|발의|멘토|가이드/,
  GROWTH: /배움|성장|회고|피드백|학습|개발|자격|공부|도전|실패|개선점/,
};

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return `c${Math.abs(h).toString(36)}`;
}

export function scoreTextAgainstCompetency(text: string, code: CompetencyCode): number {
  const hint = COMPETENCY_HINTS[code];
  if (!hint) return 0;
  const matches = text.match(new RegExp(hint.source, "g"));
  if (!matches?.length) return 0;
  return Math.min(1, 0.35 + matches.length * 0.2);
}

export function mapClaimCompetencies(text: string, tags?: string[]): ClaimCompetencyScore[] {
  const corpus = `${text} ${(tags ?? []).join(" ")}`;
  const scored = COMPETENCY_CODES.map((code) => ({
    code,
    score: scoreTextAgainstCompetency(corpus, code),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored.slice(0, 3);

  // 힌트가 없으면 JOB_FIT 약한 기본 링크 — 완전 고아 claim 방지
  return [{ code: "JOB_FIT", score: 0.2 }];
}

export function buildResumeEvidence(summary: ResumeSummary): ResumeEvidenceClaim[] {
  const claims: ResumeEvidenceClaim[] = [];
  const seen = new Set<string>();

  const push = (title: string, text: string, tags?: string[]) => {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed.length < 20) return;
    const claimId = simpleHash(`${title}|${trimmed.slice(0, 80)}`);
    if (seen.has(claimId)) return;
    seen.add(claimId);
    claims.push({
      claimId,
      title: title.trim() || "경험",
      text: trimmed.slice(0, 1200),
      competencies: mapClaimCompetencies(trimmed, tags),
    });
  };

  for (const chunk of summary.chunks ?? []) {
    push(chunk.title, chunk.markdown, chunk.tags);
  }
  for (const exp of summary.experiences ?? []) {
    const title = exp.length > 28 ? `${exp.slice(0, 26)}…` : exp;
    push(title, exp);
  }

  return claims.slice(0, 12);
}

/** 요약에 evidence가 없으면 결정론적으로 채운다 */
export function ensureResumeEvidence(summary: ResumeSummary): ResumeSummary {
  if (Array.isArray(summary.evidence) && summary.evidence.length > 0) {
    return summary;
  }
  return { ...summary, evidence: buildResumeEvidence(summary) };
}

export function performanceBand(p?: CompetencyPerformance | null): PerformanceBand {
  if (!p) return "unknown";
  const level = p.levelEst;
  const pct = p.percentile;
  const theta = p.theta;
  if (level != null) {
    if (level <= 2) return "weak";
    if (level >= 4) return "strong";
    return "mid";
  }
  if (pct != null) {
    if (pct < 35) return "weak";
    if (pct >= 70) return "strong";
    return "mid";
  }
  if (theta != null) {
    if (theta < -0.3) return "weak";
    if (theta > 0.5) return "strong";
    return "mid";
  }
  return "unknown";
}

/**
 * 역량 질문용 claim 순위.
 * - 해당 역량 SUPPORTS 점수가 기본
 * - 면접 답변 수준이 weak면 검증 가능한(수치 포함) claim 우선 — 보완 기회
 * - strong이면 깊이 캐묻기 좋게 점수 높은 claim 우선
 */
export function rankEvidenceForCompetency(
  evidence: ResumeEvidenceClaim[],
  competency: string,
  performance?: CompetencyPerformance | null,
): ResumeEvidenceClaim[] {
  const band = performanceBand(performance);
  const metric = /\d+(\.\d+)?\s*(%|퍼센트|명|건|억|만\s?원|배|회)/;

  return [...evidence]
    .map((e) => {
      const link = e.competencies.find((c) => c.code === competency);
      let rank = link?.score ?? 0;
      if (band === "weak" && metric.test(e.text)) rank += 0.25;
      if (band === "strong") rank += (link?.score ?? 0) * 0.15;
      if (band === "mid" && metric.test(e.text)) rank += 0.1;
      return { e, rank };
    })
    .filter((x) => x.rank > 0 || evidence.length <= 2)
    .sort((a, b) => b.rank - a.rank)
    .map((x) => x.e);
}

export function evidenceGaps(
  evidence: ResumeEvidenceClaim[],
  focus?: CompetencyCode[],
): Array<{ code: CompetencyCode; strength: number }> {
  const codes = focus?.length ? focus : [...COMPETENCY_CODES];
  return codes
    .map((code) => {
      const best = Math.max(
        0,
        ...evidence.flatMap((e) =>
          e.competencies.filter((c) => c.code === code).map((c) => c.score),
        ),
      );
      return { code, strength: best };
    })
    .sort((a, b) => a.strength - b.strength);
}

export function claimsAsChunks(claims: ResumeEvidenceClaim[]): ResumeChunk[] {
  return claims.map((c) => ({
    title: c.title,
    markdown: c.text,
    tags: c.competencies.map((x) => x.code),
  }));
}

export function claimsAsExperiences(claims: ResumeEvidenceClaim[]): string[] {
  return claims.map((c) => c.text);
}

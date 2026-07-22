/**
 * QuadScope — AXHRD product lens (person scorecard)
 *
 * Four scopes for Hire / Grow / Sense / Assess.
 * Distinct from interview *answer craft* 6-axes (BEI delivery quality).
 */

export const QUADSCOPE_PRODUCT = {
  name: "QuadScope",
  taglineEn: "Four scopes to see a person",
  taglineKo: "사람을 네 가지 범위로 본다",
} as const;

export type QuadScopeId = "judgment" | "delivery" | "relations" | "anchor";

export type QuadScopeDef = {
  id: QuadScopeId;
  /** Product English label (UI primary) */
  nameEn: string;
  /** Short Korean aid (secondary) */
  nameKo: string;
  descriptionEn: string;
  descriptionKo: string;
};

export const QUADSCOPE_SCOPES: readonly QuadScopeDef[] = [
  {
    id: "judgment",
    nameEn: "Judgment",
    nameKo: "판단",
    descriptionEn: "Define problems, analyze causes, choose with clarity",
    descriptionKo: "문제를 정의하고 원인을 분석하며 분명하게 선택한다",
  },
  {
    id: "delivery",
    nameEn: "Delivery",
    nameKo: "성과",
    descriptionEn: "Execute commitments and own measurable outcomes",
    descriptionKo: "약속을 실행하고 측정 가능한 결과에 책임진다",
  },
  {
    id: "relations",
    nameEn: "Relations",
    nameKo: "관계",
    descriptionEn: "Collaborate, persuade, and build shared goals with others",
    descriptionKo: "협업·설득하며 타인과 공동 목표를 만든다",
  },
  {
    id: "anchor",
    nameEn: "Anchor",
    nameKo: "중심",
    descriptionEn: "Grow, adapt, and hold integrity under pressure",
    descriptionKo: "성장·적응하며 압박 속에서도 가치를 지킨다",
  },
] as const;

export const QUADSCOPE_IDS = QUADSCOPE_SCOPES.map((s) => s.id);

export type QuadScopeJobId = "hire" | "grow" | "sense" | "assess";

export type QuadScopeJobDef = {
  id: QuadScopeJobId;
  nameEn: string;
  nameKo: string;
  descriptionEn: string;
  descriptionKo: string;
};

/** Customer Jobs — menu grouping aligned to org entitlements */
export const QUADSCOPE_JOBS: readonly QuadScopeJobDef[] = [
  {
    id: "hire",
    nameEn: "Hire",
    nameKo: "채용·실전",
    descriptionEn: "Interview, resume, discovery, assessment center",
    descriptionKo: "면접·자소서·자기발견·역량평가",
  },
  {
    id: "grow",
    nameEn: "Grow",
    nameKo: "육성",
    descriptionEn: "Learning path, game, drills",
    descriptionKo: "학습 패스·게임·드릴",
  },
  {
    id: "sense",
    nameEn: "Sense",
    nameKo: "진단",
    descriptionEn: "Organization diagnostic waves",
    descriptionKo: "조직진단 웨이브",
  },
  {
    id: "assess",
    nameEn: "Assess",
    nameKo: "과제",
    descriptionEn: "AC tasks and evidence reports",
    descriptionKo: "AC 과제·증거 리포트",
  },
] as const;

/** IRT core competency → primary QuadScope */
export const COMPETENCY_TO_QUADSCOPE: Record<string, QuadScopeId> = {
  PROBLEM_SOLVING: "judgment",
  JOB_FIT: "delivery",
  COMMUNICATION: "relations",
  ORG_FIT: "relations",
  LEADERSHIP: "relations",
  GROWTH: "anchor",
  // Lexicon extensions (when scored later)
  ANALYTICAL_THINKING: "judgment",
  DECISION_QUALITY: "judgment",
  NCS_NUMERACY: "judgment",
  NCS_INFORMATION: "judgment",
  NCS_TECHNOLOGY: "delivery",
  NCS_RESOURCE: "delivery",
  ACHIEVEMENT_DRIVE: "delivery",
  RESULT_OWNERSHIP: "delivery",
  INITIATIVE: "delivery",
  TEAMWORK: "relations",
  CONFLICT_RESOLUTION: "relations",
  INTERPERSONAL: "relations",
  STAKEHOLDER_ALIGN: "relations",
  CUSTOMER_ORIENT: "relations",
  INFLUENCE: "relations",
  INTEGRITY: "anchor",
  WORK_ETHICS: "anchor",
  SELF_MGMT: "anchor",
  ADAPTABILITY: "anchor",
  SAFETY_COMPLIANCE: "anchor",
};

export function scopeDef(id: QuadScopeId): QuadScopeDef {
  return QUADSCOPE_SCOPES.find((s) => s.id === id)!;
}

export function jobDef(id: QuadScopeJobId): QuadScopeJobDef {
  return QUADSCOPE_JOBS.find((j) => j.id === id)!;
}

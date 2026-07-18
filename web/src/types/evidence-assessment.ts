/**
 * 증거 기반 평가 리포트 계약 (v1)
 * — 역할수행 과제 / 모의면접 / 조직진단 서사에 공통으로 쓰는 구조.
 * 첨부 샘플(평정 1–5 · 하위역량 · +/- 행동 · 평정 근거 · 개발 제언)과 정렬.
 */

/** 평정 1–5 수준 라벨 (행동분류 참조표) */
export type RatingLevelLabel =
  | "매우 미흡"
  | "미흡"
  | "보통"
  | "우수"
  | "매우 우수";

export type BehaviorPolarity = "POSITIVE" | "NEGATIVE_OR_MISSING";

export type EvidenceAssessmentDomain =
  | "INTERVIEW"
  | "ROLE_PLAY"
  | "DIAGNOSTIC"
  | "IN_BASKET";

/** 관찰된 행동 한 줄 — 인용·맥락을 포함할 수 있음 */
export type ObservedBehavior = {
  polarity: BehaviorPolarity;
  /** 관찰 요약 */
  text: string;
  /** 실제 발화 인용 — 지어내지 않음 */
  quote?: string | null;
  /** 상대 발화·상황 트리거 */
  trigger?: string | null;
  /** 왜 점수에 영향을 주는지 */
  analysis?: string | null;
  /** 연결된 행동지표 코드 */
  indicatorCode?: string | null;
};

export type SubCompetencyAssessment = {
  code: string;
  nameKo: string;
  /** 1–5 */
  score: number;
  observedBehaviors: ObservedBehavior[];
};

export type CompetencyAssessmentBlock = {
  code: string;
  nameKo: string;
  definition: string;
  /** 1–5 */
  score: number;
  levelLabel: RatingLevelLabel;
  subCompetencies: SubCompetencyAssessment[];
  /** 평정 근거 */
  rationale: string;
  /** 개발 제언 — 구체 스크립트 포함 가능 */
  developmentAdvice: string;
};

export type RatingScaleRow = {
  score: 1 | 2 | 3 | 4 | 5;
  levelLabel: RatingLevelLabel;
  criteria: string;
};

export type DevelopmentTask = {
  title: string;
  body: string;
  practiceSequence?: string | null;
};

/**
 * 증거형 평가 리포트 본체.
 * SessionReport.evidenceJson / BehavioralAssessmentReport.reportJson 에 저장.
 */
export type EvidenceAssessmentReport = {
  schemaVersion: 1;
  domain: EvidenceAssessmentDomain;
  reportKindLabel: string;
  title: string;
  roleContext?: string | null;
  overallScore: number;
  overallScaleMax: 5;
  overallLevelLabel: RatingLevelLabel;
  executiveSummary: string;
  competencies: CompetencyAssessmentBlock[];
  strengths: string[];
  developmentTasks: DevelopmentTask[];
  ratingScale?: RatingScaleRow[];
  recommendedSequence?: string | null;
};

export type SubskillContent = {
  code: string;
  nameKo: string;
  definition: string;
  indicators: Array<{
    code: string;
    polarity: BehaviorPolarity;
    textKo: string;
  }>;
};

export function scoreToLevelLabel(score: number): RatingLevelLabel {
  if (score >= 4.5) return "매우 우수";
  if (score >= 3.5) return "우수";
  if (score >= 2.5) return "보통";
  if (score >= 1.5) return "미흡";
  return "매우 미흡";
}

/** 레거시 0–100 점수를 1–5로 근사 변환 */
export function percentileToFiveScale(score0to100: number): number {
  const clamped = Math.min(100, Math.max(0, score0to100));
  return Math.round(((clamped / 100) * 4 + 1) * 100) / 100;
}

// ── Competencies ──

export const COMPETENCY_CODES = [
  "COMMUNICATION",
  "PROBLEM_SOLVING",
  "JOB_FIT",
  "ORG_FIT",
  "LEADERSHIP",
  "GROWTH",
] as const;

export type CompetencyCode = (typeof COMPETENCY_CODES)[number];

// ── Industry (기업명 대신 선택하는 산업군) ──

export const INDUSTRY_CODES = [
  "IT_SW",
  "FINANCE",
  "MANUFACTURING",
  "PUBLIC",
  "OTHER",
] as const;

export type IndustryCode = (typeof INDUSTRY_CODES)[number];

// ── Job role ──

export const JOB_ROLES = [
  "MARKETING",
  "DEVELOPMENT",
  "BUSINESS_SUPPORT",
  "SALES",
  "DESIGN",
  "HR",
  "FINANCE",
  "OTHER",
] as const;

export type JobRoleCode = (typeof JOB_ROLES)[number];

// ── IRT Engine types (mirrors Python schemas) ──

export type ChipType = "pass" | "attempt" | "downgrade";

export interface ItemParams {
  item_id: string;
  competency: string;
  difficulty: number;
  discrimination: number;
  level: number;
}

export interface CompetencyState {
  competency: string;
  theta: number;
  standard_error: number;
  current_level: number;
  response_count: number;
}

export interface ChipEvent {
  competency: string;
  level: number;
  chip_type: ChipType;
  rubric_score: number;
  brief_feedback: string;
  /** 이 문항에 AI 꼬리질문이 있었는지 (있었다면 rubric_score는 원 답변+꼬리질문 답변 종합 점수) */
  had_follow_up?: boolean;
}

/** 문항 답변 직후 클라이언트에 보여주는 핵심 피드백 */
export interface AnswerEvidence {
  /** 점수/차원과 연결된 실제 답변 인용 */
  quote: string;
  /** 이 인용이 뒷받침하는 평가 포인트 (예: "구체성 높음", "결과 수치 부족") */
  supports: string;
}

export interface AnswerFeedback {
  summary: string;
  keyPoints: string[];
  irtNote: string;
  quote?: string;
  /** 점수 옆에 붙는 근거 인용 목록 (답변에서만 추출) */
  evidence?: AnswerEvidence[];
  score?: number;
  chipType?: ChipType;
  level?: number;
  competency?: string;
  isInterim?: boolean;
  tripleFeedback?: import("@/lib/interview/triple-feedback").TripleFeedbackResult;
  dimensions?: {
    starStructure: number;
    questionIntent: number;
    logic: number;
    delivery: number;
  };
  weakestDimension?: string;
}

export interface NextItem {
  item_id: string;
  competency: string;
  level: number;
  target_level: number;
  difficulty: number;
  expected_information: number;
}

export interface SubmitResponseResult {
  competency_states: Record<string, CompetencyState>;
  chip_event: ChipEvent;
  next_item: NextItem | null;
  should_terminate: boolean;
  total_items: number;
}

export interface CompetencySummary {
  competency: string;
  theta: number;
  standard_error: number;
  level_estimate: number;
  percentile: number;
}

export interface SessionSummary {
  session_id: string;
  competencies: CompetencySummary[];
  overall_theta: number;
}

// ── Interview UI ──

export interface InterviewQuestion {
  id: string;
  externalId: string;
  competency: string;
  level: number;
  text: string;
  personalizedText?: string;
  /** "왜 이 질문인가요?" — IRT 문항 선택 근거를 후보자에게 설명하는 문구 */
  rationale?: string;
  /** true면 같은 문항에 대한 AI 꼬리질문 — 답변이 추상적일 때 한 번 더 파고드는 질문 */
  isFollowUp?: boolean;
  /** 압박 강도 적응형 조절 — 현재 역량 추정 레벨에 따라 면접관 톤이 달라짐 (NEUTRAL이면 UI에 배지 미표시) */
  pressureTier?: "GENTLE" | "NEUTRAL" | "TOUGH";
  personaLabel?: string;
  /** 자소서 인용으로 실제 개인화된 문항인지 — "자소서 맞춤 질문" 배지 표시 기준.
   *  (personalizedText가 text와 다르다고 해서 자소서 인용이라는 뜻은 아님 — 압박 톤 프리픽스나
   *  꼬리질문도 다르게 나오므로 이 필드로 명시적으로 구분한다) */
  resumePersonalized?: boolean;
  /** JD 전용 보너스 질문 — theta/점수 미반영 */
  isBonusQuestion?: boolean;
  /** 자소서에서 질문에 인용한 근거 구절 — UI에 "자소서 근거"로 표시 */
  resumeAnchors?: string[];
}

export interface InterviewSessionState {
  sessionId: string;
  status: "setup" | "in_progress" | "completed";
  currentQuestion: InterviewQuestion | null;
  competencyStates: Record<string, CompetencyState>;
  chipHistory: ChipEvent[];
  administeredIds: string[];
  totalItems: number;
  shouldTerminate: boolean;
}

// ── Company enrichment ──

export const COMPANY_SIZE_CODES = [
  "LARGE",
  "MID",
  "SMALL",
  "STARTUP",
  "PUBLIC",
] as const;

export type CompanySizeCode = (typeof COMPANY_SIZE_CODES)[number];

export interface CompanyContext {
  name: string;
  industry: string;
  size: CompanySizeCode;
  interviewStyle: {
    tone: string;
    rounds: string[];
    focus: string[];
  };
}

// ── Report ──

export interface ReportSection {
  title: string;
  content: string;
  score?: number;
  suggestions?: string[];
  /** 해당 역량 답변 중 실제로 인용한 문장 (지어내지 않음) */
  highlight?: string;
}

export interface SessionReportData {
  summary: string;
  sections: ReportSection[];
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}

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

export interface CompanyContext {
  name: string;
  industry: string;
  size: "LARGE" | "MID" | "SMALL" | "STARTUP" | "PUBLIC";
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

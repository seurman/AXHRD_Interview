export interface DiscoverStrengthItem {
  viaCode: string;
  viaLabelKo: string;
  virtueKo: string;
  quote: string;
  explanation: string;
}

export interface DiscoverValueItem {
  schwartzCode: string;
  schwartzLabelKo: string;
  quote: string;
  explanation: string;
}

export interface DiscoverWeaknessItem {
  area: string;
  suggestion: string;
  quote?: string;
}

export interface DiscoverCompetencySignal {
  code: string;
  labelKo: string;
  signal: string;
  quote: string;
}

/** 강점 → NCS 역량 → 면접 활용 조언 */
export interface DiscoverInterviewAdvice {
  viaCode: string;
  viaLabelKo: string;
  competencyCode: string;
  competencyLabelKo: string;
  bridge: string;
  interviewTip: string;
  starPrompt: string;
  quote: string;
}

export interface DiscoverProfileData {
  strengths: DiscoverStrengthItem[];
  weaknesses: DiscoverWeaknessItem[];
  values: DiscoverValueItem[];
  competencySignals: DiscoverCompetencySignal[];
  narrativeSummary: string;
  interviewAdvice?: DiscoverInterviewAdvice[];
  /** Holland RIASEC 보조 힌트 (선택) */
  riasecHint?: { code: string; labelKo: string; note: string } | null;
}

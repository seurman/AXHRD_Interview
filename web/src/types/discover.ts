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

export interface DiscoverProfileData {
  strengths: DiscoverStrengthItem[];
  weaknesses: DiscoverWeaknessItem[];
  values: DiscoverValueItem[];
  competencySignals: DiscoverCompetencySignal[];
  narrativeSummary: string;
  /** Holland RIASEC 보조 힌트 (선택) */
  riasecHint?: { code: string; labelKo: string; note: string } | null;
}

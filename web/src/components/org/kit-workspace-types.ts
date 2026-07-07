export type ApiQuestion = {
  id: string;
  externalId: string;
  competencyCode: string;
  level: number;
  template: string;
  isActive: boolean;
};

export type ApiCompetency = {
  code: string;
  nameKo: string;
  description: string | null;
  platformRubricOptions: string[];
};

export type ApiKit = {
  competency: string;
  selectedQuestionIds: string[];
  customRubricCriteria: string[];
  updatedAt: string;
};

export type ApiPayload = {
  limits: { min: number; recommended: number };
  competencies: ApiCompetency[];
  questions: ApiQuestion[];
  kits: ApiKit[];
};

export type CompetencyDraft = {
  selectedIds: string[];
  checkedPlatformRubric: Set<string>;
  customRubricLines: string[];
  dirty: boolean;
  saving: boolean;
  message: string | null;
};

export function kitQuestionSortId(code: string, questionId: string) {
  return `kit-q:${code}:${questionId}`;
}

export function parseKitQuestionSortId(id: string): { code: string; questionId: string } | null {
  if (!id.startsWith("kit-q:")) return null;
  const parts = id.split(":");
  if (parts.length < 3) return null;
  return { code: parts[1], questionId: parts[2] };
}

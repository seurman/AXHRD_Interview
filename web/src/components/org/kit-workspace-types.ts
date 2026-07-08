import type { RubricByLevel } from "@/lib/competency/rubric";

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
  rubricByLevel: RubricByLevel;
};

export type ApiKit = {
  competency: string;
  selectedQuestionIds: string[];
  customRubricByLevel: RubricByLevel;
  updatedAt: string;
};

export type ApiPayload = {
  organizationId: string;
  organizationName: string;
  mode: "org_admin" | "superadmin";
  limits: { min: number; recommended: number };
  competencies: ApiCompetency[];
  questions: ApiQuestion[];
  kits: ApiKit[];
};

export type LevelRubricDraft = {
  checkedPlatform: Set<string>;
  customLines: string[];
};

export type CompetencyDraft = {
  selectedIds: string[];
  rubricLevel: number;
  rubricByLevel: Record<string, LevelRubricDraft>;
  dirty: boolean;
  saving: boolean;
  message: string | null;
};

export const KIT_RUBRIC_LEVELS = [1, 2, 3, 4, 5] as const;

export function kitQuestionSortId(code: string, questionId: string) {
  return `kit-q:${code}:${questionId}`;
}

export function parseKitQuestionSortId(id: string): { code: string; questionId: string } | null {
  if (!id.startsWith("kit-q:")) return null;
  const parts = id.split(":");
  if (parts.length < 3) return null;
  return { code: parts[1], questionId: parts[2] };
}

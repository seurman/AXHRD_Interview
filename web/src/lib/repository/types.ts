import type {
  CompetencyLifecycleStatus,
  Prisma,
  RubricScoringSystem,
} from "@prisma/client";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

export const LIFECYCLE_LABEL: Record<CompetencyLifecycleStatus, string> = {
  DRAFT: "개발중",
  ACTIVE: "활성화",
  ARCHIVED: "숨김",
};

export function lifecycleToIsActive(status: CompetencyLifecycleStatus): boolean {
  return status === "ACTIVE";
}

export type RepositoryCompetencyRow = {
  id: string;
  code: string;
  nameKo: string;
  category: string;
  description: string | null;
  lifecycleStatus: CompetencyLifecycleStatus;
  isActive: boolean;
  source: string;
  questionCount: number;
};

export type RubricDetailInput = {
  scoreLevel: number;
  levelName?: string | null;
  behavioralIndicator: string;
};

export type RubricSetInput = {
  organizationId?: string | null;
  competencyId: string;
  rubricName: string;
  scoringSystem?: RubricScoringSystem;
  isDefault?: boolean;
  details: RubricDetailInput[];
};

export const platformCompetencyWhere: Prisma.CompetencyWhereInput = {
  ...PLATFORM_OWNER_FILTER,
};

export function defaultScoreLevels(system: RubricScoringSystem): number[] {
  if (system === "PASS_FAIL") return [1, 0];
  if (system === "THREE_SCALE") return [3, 2, 1];
  return [5, 4, 3, 2, 1];
}

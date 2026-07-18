/**
 * 시도 시작 시 고정하는 역량·루브릭·행동지표 스냅샷.
 * 게시 후 루브릭이 바뀌어도 채점 재현성을 보장한다.
 */
import type { ScenarioFramework } from "@/lib/assessment/load-scenario-context";

export type RubricLevelSnapshot = {
  scoreLevel: number;
  levelName: string | null;
  criteria: string[];
};

export type CompetencyFrameworkSnapshot = ScenarioFramework & {
  competencyId: string | null;
  rubricSetId: string | null;
  rubricName: string | null;
  scoringLevels: RubricLevelSnapshot[];
};

export type AssessmentFrameworkSnapshot = {
  schemaVersion: 1;
  capturedAt: string;
  scenarioId: string;
  scenarioCode: string;
  scenarioVersion: number;
  competencies: CompetencyFrameworkSnapshot[];
};

export function isAssessmentFrameworkSnapshot(
  value: unknown,
): value is AssessmentFrameworkSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 1 &&
    typeof v.scenarioId === "string" &&
    typeof v.scenarioCode === "string" &&
    Array.isArray(v.competencies)
  );
}

export function parseAssessmentFrameworkSnapshot(
  value: unknown,
): AssessmentFrameworkSnapshot | null {
  return isAssessmentFrameworkSnapshot(value) ? value : null;
}

/** 스냅샷 competency 블록을 채점용 ScenarioFramework 배열로 변환 */
export function frameworksFromSnapshot(
  snapshot: AssessmentFrameworkSnapshot,
): ScenarioFramework[] {
  return snapshot.competencies.map((c) => ({
    code: c.code,
    nameKo: c.nameKo,
    definition: c.definition,
    subskills: c.subskills,
  }));
}

import { parseRubricCriteria } from "@/lib/competency/bank";
import { parseRubricByLevel, rubricForCompetencyLevel } from "@/lib/competency/rubric";
import {
  criteriaFromRubricDetails,
  defaultRubricSetHasLevel,
} from "@/lib/competency/rubric-ssot";

export type QuestionCoverageKind =
  | "mapped"
  | "question_criteria"
  | "competency_level"
  | "missing";

export type QuestionCoverage = {
  kind: QuestionCoverageKind;
  criteriaCount: number;
  mappedRubricSetId: string | null;
};

export function resolveQuestionCoverage(input: {
  level: number;
  rubricCriteria: unknown;
  rubricByLevel: unknown;
  mappedRubricSetId: string | null;
  defaultRubricDetails?: Array<{ scoreLevel: number; behavioralIndicator: string }> | null;
}): QuestionCoverage {
  if (input.mappedRubricSetId) {
    return {
      kind: "mapped",
      criteriaCount: 0,
      mappedRubricSetId: input.mappedRubricSetId,
    };
  }

  const questionCriteria = parseRubricCriteria(input.rubricCriteria);
  if (questionCriteria.length > 0) {
    return {
      kind: "question_criteria",
      criteriaCount: questionCriteria.length,
      mappedRubricSetId: null,
    };
  }

  if (defaultRubricSetHasLevel(input.defaultRubricDetails ?? null, input.level)) {
    return {
      kind: "mapped",
      criteriaCount: criteriaFromRubricDetails(input.defaultRubricDetails, input.level).length,
      mappedRubricSetId: null,
    };
  }

  const levelCriteria = rubricForCompetencyLevel(input.rubricByLevel, input.level);
  if (levelCriteria.length > 0) {
    return {
      kind: "competency_level",
      criteriaCount: levelCriteria.length,
      mappedRubricSetId: null,
    };
  }

  return { kind: "missing", criteriaCount: 0, mappedRubricSetId: null };
}

export const COVERAGE_LABEL: Record<QuestionCoverageKind, string> = {
  mapped: "루브릭 세트 (연결 또는 기본)",
  question_criteria: "문항별 채점 기준",
  competency_level: "역량 L-루브릭 (legacy JSON)",
  missing: "채점 기준 없음",
};

export function legacyRubricLevels(rubricByLevel: unknown) {
  const map = parseRubricByLevel(rubricByLevel);
  return [5, 4, 3, 2, 1]
    .map((level) => ({
      level,
      criteria: map[String(level)] ?? map.default ?? [],
    }))
    .filter((row) => row.criteria.length > 0);
}

export function legacyRubricToDetails(rubricByLevel: unknown) {
  return legacyRubricLevels(rubricByLevel).map((row) => ({
    scoreLevel: row.level,
    levelName: `L${row.level}`,
    behavioralIndicator: row.criteria.map((c) => `• ${c}`).join("\n"),
  }));
}

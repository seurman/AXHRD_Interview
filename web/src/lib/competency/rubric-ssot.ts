import { rubricForNcsLevel } from "@/lib/competency/ncs-rubric";
import {
  parseRubricByLevel,
  rubricForCompetencyLevel,
  type RubricByLevel,
} from "@/lib/competency/rubric";

export type RubricDetailRow = {
  scoreLevel: number;
  levelName?: string | null;
  behavioralIndicator: string;
};

/** RubricDetail.behavioralIndicator → 채점용 문자열 배열 */
export function behavioralIndicatorToCriteria(indicator: string): string[] {
  return indicator
    .split("\n")
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export function criteriaFromRubricDetails(
  details: RubricDetailRow[] | null | undefined,
  level: number,
): string[] {
  if (!details?.length) return [];
  const row =
    details.find((d) => d.scoreLevel === level) ??
    details.find((d) => d.scoreLevel === 3) ??
    details[0];
  if (!row) return [];
  return behavioralIndicatorToCriteria(row.behavioralIndicator);
}

export function rubricByLevelFromDetails(details: RubricDetailRow[]): RubricByLevel {
  const out: RubricByLevel = {};
  for (const d of details) {
    const criteria = behavioralIndicatorToCriteria(d.behavioralIndicator);
    if (criteria.length > 0) {
      out[String(d.scoreLevel)] = criteria;
    }
  }
  return out;
}

export function detailsFromRubricByLevel(rubricByLevel: unknown): RubricDetailRow[] {
  const map = parseRubricByLevel(rubricByLevel);
  const rows: RubricDetailRow[] = [];
  for (const scoreLevel of [5, 4, 3, 2, 1]) {
    const criteria = map[String(scoreLevel)] ?? [];
    if (criteria.length === 0) continue;
    rows.push({
      scoreLevel,
      levelName: `L${scoreLevel}`,
      behavioralIndicator: criteria.map((c) => `• ${c}`).join("\n"),
    });
  }
  return rows;
}

export type RubricResolveInput = {
  orgKitRubric?: string[] | null;
  questionCriteria?: unknown;
  questionLevel: number;
  competencyCode: string;
  legacyRubricByLevel?: unknown;
  mappedRubricDetails?: RubricDetailRow[] | null;
  defaultRubricDetails?: RubricDetailRow[] | null;
};

function parseQuestionCriteria(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
}

/**
 * 면접 채점 루브릭 해석 — 우선순위:
 * 1. 기관 킷 커스텀
 * 2. 문항 rubricCriteria
 * 3. 문항에 연결된 RubricSet
 * 4. 역량 기본(플랫폼) RubricSet
 * 5. legacy rubricByLevel JSON
 * 6. NCS 하드코드 폴백
 */
export function resolveRubricCriteria(input: RubricResolveInput): string[] {
  if (input.orgKitRubric && input.orgKitRubric.length > 0) {
    return input.orgKitRubric;
  }

  const questionCriteria = parseQuestionCriteria(input.questionCriteria);
  if (questionCriteria.length > 0) return questionCriteria;

  const fromMapped = criteriaFromRubricDetails(input.mappedRubricDetails, input.questionLevel);
  if (fromMapped.length > 0) return fromMapped;

  const fromDefault = criteriaFromRubricDetails(input.defaultRubricDetails, input.questionLevel);
  if (fromDefault.length > 0) return fromDefault;

  const legacy = rubricForCompetencyLevel(input.legacyRubricByLevel, input.questionLevel);
  if (legacy.length > 0) return legacy;

  return rubricForNcsLevel(input.competencyCode, input.questionLevel);
}

export function defaultRubricSetHasLevel(
  details: RubricDetailRow[] | null | undefined,
  level: number,
): boolean {
  return criteriaFromRubricDetails(details, level).length > 0;
}

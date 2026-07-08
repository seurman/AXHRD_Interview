/**
 * 인터뷰 킷 루브릭 헬퍼 — 클라이언트 컴포넌트에서 import 가능
 * (prisma / next/headers 의존 금지)
 */
import { parseRubricCriteria } from "@/lib/competency/bank";
import { rubricForNcsLevel } from "@/lib/competency/ncs-rubric";
import {
  parseRubricByLevel,
  rubricForCompetencyLevel,
  type RubricByLevel,
} from "@/lib/competency/rubric";

export function parseSelectedQuestionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** 플랫폼 기본 루브릭 후보(역량 rubricByLevel 전 레벨 합집합, 없으면 NCS L3) */
export function platformRubricOptions(
  competencyCode: string,
  rubricByLevel: unknown
): string[] {
  const map =
    rubricByLevel && typeof rubricByLevel === "object" && !Array.isArray(rubricByLevel)
      ? (rubricByLevel as Record<string, unknown>)
      : {};
  const seen = new Set<string>();
  const out: string[] = [];
  for (const val of Object.values(map)) {
    if (!Array.isArray(val)) continue;
    for (const line of val) {
      if (typeof line !== "string" || !line.trim()) continue;
      const t = line.trim();
      if (!seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  if (out.length > 0) return out;
  return rubricForNcsLevel(competencyCode, 3);
}

/** 플랫폼 역량·레벨 기본 루브릭 (DB rubricByLevel → NCS 폴백) */
export function platformRubricForLevel(
  competencyCode: string,
  rubricByLevel: unknown,
  level: number
): string[] {
  const fromDb = rubricForCompetencyLevel(rubricByLevel, level);
  if (fromDb.length > 0) return fromDb;
  return rubricForNcsLevel(competencyCode, level);
}

/** 기관 킷 customRubricCriteria — 레벨별 객체 또는 레거시 flat 배열 */
export function parseOrgKitRubricByLevel(raw: unknown): RubricByLevel {
  if (Array.isArray(raw)) {
    const lines = parseRubricCriteria(raw);
    if (lines.length === 0) return {};
    return { default: lines };
  }
  return parseRubricByLevel(raw);
}

export function orgKitRubricForLevel(
  customRubricByLevel: RubricByLevel,
  level: number
): string[] {
  const levelKey = String(level);
  if (customRubricByLevel[levelKey]?.length) return customRubricByLevel[levelKey];
  if (customRubricByLevel.default?.length) return customRubricByLevel.default;
  return [];
}

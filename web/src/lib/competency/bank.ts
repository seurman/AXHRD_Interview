import { prisma } from "@/lib/prisma";
import { COMPETENCY_CODES } from "@/types";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";

export function parseRubricCriteria(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
}

export function parseFollowUpHints(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((h): h is string => typeof h === "string" && h.trim().length > 0);
}

/** 면접·설정 UI에 노출할 활성 역량 코드(정렬 순). DB 비어 있으면 하드코딩 폴백. */
export async function getActiveCompetencyCodes(): Promise<string[]> {
  const rows = await prisma.competency.findMany({
    where: { isActive: true, ...PLATFORM_OWNER_FILTER },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { code: true },
  });
  if (rows.length === 0) return [...COMPETENCY_CODES];
  return rows.map((r) => r.code);
}

export async function getActiveCompetencies() {
  return prisma.competency.findMany({
    where: { isActive: true, ...PLATFORM_OWNER_FILTER },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: { code: true, nameKo: true, description: true },
  });
}

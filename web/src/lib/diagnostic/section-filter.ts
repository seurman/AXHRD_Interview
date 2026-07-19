/** 웨이브별 활성 섹션 — null이면 전체 섹션 활성(하위호환) */

export function parseEnabledSectionCodes(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const codes = raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  return codes.length > 0 ? codes : null;
}

export function filterSectionsByEnabled<T extends { code: string }>(
  sections: T[],
  enabled: string[] | null,
): T[] {
  if (!enabled?.length) return sections;
  const set = new Set(enabled);
  set.add("DM");
  return sections.filter((s) => set.has(s.code));
}

export function sectionBadgeLabel(codes: string[] | null): string {
  if (!codes?.length) return "전체 4축";
  return codes.join(" · ");
}

/** 기존 운영 웨이브 하위호환 — null이면 DM01~DM05만 */
export const DEFAULT_DEMOGRAPHIC_CODES = ["DM01", "DM02", "DM03", "DM04", "DM05"] as const;

/** 카탈로그 전체(시드 DM 섹션과 동기) */
export const DEMOGRAPHIC_ITEM_CODES = [
  "DM01",
  "DM02",
  "DM03",
  "DM04",
  "DM05",
  "DM06",
  "DM07",
  "DM08",
  "DM09",
  "DM10",
  "DM11",
  "DM12",
] as const;

export type DemographicItemCode = (typeof DEMOGRAPHIC_ITEM_CODES)[number];

export function parseEnabledDemographicItemCodes(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const codes = raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  return codes.length > 0 ? codes : null;
}

/**
 * 데모그래픽 문항 필터.
 * enabled가 null/빈 배열이면 반드시 기존 5개(DM01~DM05)만 반환 — 하위호환 최우선.
 */
export function filterDemographicItems<T extends { itemCode: string; isDemographic: boolean }>(
  items: T[],
  enabled: string[] | null,
): T[] {
  const set = new Set(enabled?.length ? enabled : DEFAULT_DEMOGRAPHIC_CODES);
  return items.filter((i) => !i.isDemographic || set.has(i.itemCode));
}

/** DM04 연령대 → 세대 파생값(문항·DB 변경 없음) */
export function mapAgeBandToGeneration(
  ageBand: string | null | undefined,
): "Z" | "M" | "X" | "BB+" | null {
  if (!ageBand) return null;
  if (ageBand === "20대") return "Z";
  if (ageBand === "30대") return "M";
  if (ageBand === "40대") return "X";
  if (ageBand === "50대이상") return "BB+";
  return null;
}

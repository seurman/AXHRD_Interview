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
  return sections.filter((s) => set.has(s.code));
}

export function sectionBadgeLabel(codes: string[] | null): string {
  if (!codes?.length) return "전체 4축";
  return codes.join(" · ");
}

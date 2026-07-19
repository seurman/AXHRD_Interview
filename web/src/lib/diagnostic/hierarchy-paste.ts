import type { TeamInput } from "@/lib/diagnostic/campaigns";

/**
 * "사업본부,사업부,팀명" / 탭 구분 붙여넣기 파서.
 * 콤마·탭 개수로 레벨 판별: 1=팀만, 2=사업부+팀, 3=사업본부+사업부+팀.
 */
export function parseHierarchyPaste(text: string): TeamInput[] {
  const rows: TeamInput[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line
      .split(/[,，\t]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) continue;
    if (parts.length === 1) {
      rows.push({ name: parts[0] });
    } else if (parts.length === 2) {
      rows.push({ unitName: parts[0], name: parts[1] });
    } else {
      rows.push({ divisionName: parts[0], unitName: parts[1], name: parts[2] });
    }
  }
  return rows;
}

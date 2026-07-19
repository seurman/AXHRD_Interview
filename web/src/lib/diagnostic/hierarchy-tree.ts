export type HierarchyLevel = "DIVISION" | "UNIT" | "TEAM";

export type HierarchyTreeNode = {
  id: string;
  name: string;
  level: HierarchyLevel;
  parentId: string | null;
  department?: string | null;
};

export function levelDepth(level: HierarchyLevel): number {
  if (level === "DIVISION") return 0;
  if (level === "UNIT") return 1;
  return 2;
}

export function levelLabel(level: HierarchyLevel): string {
  if (level === "DIVISION") return "사업본부";
  if (level === "UNIT") return "사업부";
  return "팀";
}

/** parentId 기준으로 전위순회(루트→리프) 정렬 */
export function buildOrderedTree<T extends HierarchyTreeNode>(nodes: T[]): T[] {
  const byParent = new Map<string | null, T[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  const out: T[] = [];
  const walk = (parentId: string | null) => {
    for (const n of byParent.get(parentId) ?? []) {
      out.push(n);
      walk(n.id);
    }
  };
  walk(null);
  return out;
}

export type DraftTeamInput = {
  name: string;
  divisionName?: string;
  unitName?: string;
};

type DraftNode = {
  key: string;
  name: string;
  level: HierarchyLevel;
  depth: number;
};

/**
 * 생성 전 미리보기용 — TeamInput 목록을 DIVISION→UNIT→TEAM 트리로 펼친다.
 * 동일 이름 상위는 한 번만 표시.
 */
export function buildDraftHierarchyPreview(teams: DraftTeamInput[]): DraftNode[] {
  const out: DraftNode[] = [];
  const seen = new Set<string>();

  for (const t of teams) {
    const division = t.divisionName?.trim() || null;
    const unit = t.unitName?.trim() || null;
    const name = t.name.trim();
    if (!name) continue;

    if (division) {
      const dKey = `d:${division}`;
      if (!seen.has(dKey)) {
        seen.add(dKey);
        out.push({ key: dKey, name: division, level: "DIVISION", depth: 0 });
      }
    }
    if (unit) {
      const uKey = `u:${division ?? ""}>${unit}`;
      if (!seen.has(uKey)) {
        seen.add(uKey);
        out.push({
          key: uKey,
          name: unit,
          level: "UNIT",
          depth: division ? 1 : 0,
        });
      }
    }
    const tKey = `t:${division ?? ""}>${unit ?? ""}>${name}`;
    if (!seen.has(tKey)) {
      seen.add(tKey);
      out.push({
        key: tKey,
        name,
        level: "TEAM",
        depth: division && unit ? 2 : unit || division ? 1 : 0,
      });
    }
  }
  return out;
}

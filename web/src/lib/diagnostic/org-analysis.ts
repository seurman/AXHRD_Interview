import type { AnalysisRow } from "@/lib/diagnostic/analysis-tables";
import { gapValue, scoreStatus } from "@/lib/diagnostic/analysis-tables";
import { quadrantLabel } from "@/lib/diagnostic/report-narratives";

export type OrgNode = {
  teamId: string;
  teamName: string;
  level?: "DIVISION" | "UNIT" | "TEAM";
  parentId?: string | null;
  sampleSize?: number;
  hidden: boolean;
  OHI?: number | null;
  OHI_SE?: number | null;
  riskIndex?: number | null;
  ORI?: number | null;
  OVI?: number | null;
  OAI?: number | null;
  drivers?: Record<string, number | null> | null;
};

const LEVEL_LABEL: Record<string, string> = {
  DIVISION: "사업본부",
  UNIT: "사업부",
  TEAM: "팀",
};

export function orgLevelLabel(level?: string) {
  return LEVEL_LABEL[level ?? "TEAM"] ?? level ?? "팀";
}

export type OrgTreeIndex = {
  byId: Map<string, OrgNode>;
  childrenOf: Map<string | null, OrgNode[]>;
};

export function buildOrgTreeIndex(nodes: OrgNode[]): OrgTreeIndex {
  const byId = new Map(nodes.map((n) => [n.teamId, n]));
  const childrenOf = new Map<string | null, OrgNode[]>();
  for (const n of nodes) {
    const parentId = n.parentId ?? null;
    const list = childrenOf.get(parentId) ?? [];
    list.push(n);
    childrenOf.set(parentId, list);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => (b.OHI ?? 0) - (a.OHI ?? 0));
  }
  return { byId, childrenOf };
}

export function orgBreadcrumbPath(drillId: string | null, byId: Map<string, OrgNode>): OrgNode[] {
  const path: OrgNode[] = [];
  let cur = drillId ? byId.get(drillId) : undefined;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

export function getDirectChildren(
  parentId: string | null,
  { childrenOf }: OrgTreeIndex,
  visibleOnly = true,
): OrgNode[] {
  const kids = childrenOf.get(parentId) ?? [];
  return visibleOnly ? kids.filter((n) => !n.hidden) : kids;
}

export function hasOrgChildren(teamId: string, { childrenOf }: OrgTreeIndex): boolean {
  return (childrenOf.get(teamId) ?? []).length > 0;
}

/** 선택 노드 하위 리프(팀) id — Gap·드라이버 편차 스코프용 */
export function collectSubtreeLeafIds(
  rootId: string | null,
  tree: OrgTreeIndex,
  nodes: OrgNode[],
): Set<string> {
  const leaves = new Set<string>();
  const walk = (id: string) => {
    const node = tree.byId.get(id);
    if (!node || node.hidden) return;
    if (node.level === "TEAM" || !hasOrgChildren(id, tree)) {
      leaves.add(id);
      return;
    }
    for (const child of tree.childrenOf.get(id) ?? []) walk(child.teamId);
  };

  if (rootId == null) {
    for (const n of nodes) {
      if (n.hidden) continue;
      if (n.level === "TEAM") leaves.add(n.teamId);
    }
    return leaves;
  }

  walk(rootId);
  return leaves;
}

export function nodeToBenchmarks(node: OrgNode | null | undefined) {
  if (!node) return null;
  return {
    OHI: node.OHI ?? null,
    ORI: node.ORI ?? null,
    OVI: node.OVI ?? null,
    OAI: node.OAI ?? null,
  };
}

function avgNullable(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function computeOrgBenchmarks(nodes: OrgNode[]) {
  const visible = nodes.filter((n) => !n.hidden);
  return {
    OHI: avgNullable(visible.map((n) => n.OHI)),
    ORI: avgNullable(visible.map((n) => n.ORI)),
    OVI: avgNullable(visible.map((n) => n.OVI)),
    OAI: avgNullable(visible.map((n) => n.OAI)),
  };
}

export function buildOrgComparisonRows(
  nodes: OrgNode[],
  benchmarks: ReturnType<typeof computeOrgBenchmarks>,
  options?: {
    parentId?: string | null;
    levelFilter?: "DIVISION" | "UNIT" | "TEAM" | null;
    contextBenchmarks?: ReturnType<typeof computeOrgBenchmarks>;
  },
): AnalysisRow[] {
  const bench = options?.contextBenchmarks ?? benchmarks;
  const parentId = options?.parentId;
  const levelFilter = options?.levelFilter;

  const filtered = nodes
    .filter((n) => !n.hidden)
    .filter((n) => parentId === undefined || (n.parentId ?? null) === parentId)
    .filter((n) => !levelFilter || n.level === levelFilter)
    .sort((a, b) => (b.OHI ?? 0) - (a.OHI ?? 0));

  const benchLabel =
    parentId != null ? "상위 조직 대비" : "전사 대비";

  return filtered.map((n) => {
    const composite = avgNullable([n.OHI, n.ORI, n.OVI, n.OAI]);
    const benchComposite = avgNullable([bench.OHI, bench.ORI, bench.OVI, bench.OAI]);
    const vsOrg = composite != null && benchComposite != null ? composite - benchComposite : null;
    const parts = [
      n.OHI != null ? `OHI ${n.OHI.toFixed(2)}` : null,
      n.ORI != null ? `ORI ${n.ORI.toFixed(2)}` : null,
      n.OVI != null ? `OVI ${n.OVI.toFixed(2)}` : null,
      n.OAI != null ? `OAI ${n.OAI.toFixed(2)}` : null,
      n.sampleSize != null ? `N=${n.sampleSize}` : null,
      benchLabel,
    ].filter(Boolean);
    return {
      id: n.teamId,
      label: `${orgLevelLabel(n.level)} · ${n.teamName}`,
      score: composite,
      benchmark: benchComposite,
      gap: vsOrg,
      status: scoreStatus(composite),
      note: parts.join(" · "),
    };
  });
}

export function buildOrgAxisDetailRows(
  node: OrgNode,
  benchmarks: ReturnType<typeof computeOrgBenchmarks>,
): AnalysisRow[] {
  const axes: Array<{ id: string; label: string; score: number | null; bench: number | null }> = [
    { id: "OHI", label: "OHI", score: node.OHI ?? null, bench: benchmarks.OHI },
    { id: "ORI", label: "ORI", score: node.ORI ?? null, bench: benchmarks.ORI },
    { id: "OVI", label: "OVI", score: node.OVI ?? null, bench: benchmarks.OVI },
    { id: "OAI", label: "OAI", score: node.OAI ?? null, bench: benchmarks.OAI },
  ];
  return axes.map((a) => {
    const g = gapValue(a.score, a.bench);
    return {
      id: a.id,
      label: a.label,
      score: a.score,
      benchmark: a.bench,
      gap: g,
      status: scoreStatus(a.score),
      note:
        g != null && a.bench != null && a.score != null
          ? a.score >= a.bench
            ? "전사 평균 이상"
            : "전사 평균 이하"
          : "—",
    };
  });
}

export function buildDriverVarianceRows(
  leafNodes: OrgNode[],
  driverLabels: Record<string, string>,
): AnalysisRow[] {
  const visible = leafNodes.filter((n) => !n.hidden && n.drivers);
  const codes = new Set<string>();
  for (const n of visible) {
    for (const code of Object.keys(n.drivers ?? {})) codes.add(code);
  }
  const rows: AnalysisRow[] = [];
  for (const code of codes) {
    const vals = visible
      .map((n) => n.drivers?.[code])
      .filter((v): v is number => typeof v === "number");
    if (vals.length < 2) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
    const std = Math.sqrt(variance);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    rows.push({
      id: code,
      label: driverLabels[code] ?? code,
      score: mean,
      benchmark: max - min,
      gap: std,
      status: std >= 0.5 ? "주의" : std >= 0.3 ? "보통" : "양호",
      note: `팀간 편차 σ=${std.toFixed(2)} · 최저 ${min.toFixed(2)} ~ 최고 ${max.toFixed(2)}`,
    });
  }
  return rows.sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));
}

export function gapMatrixRows(
  teams: Array<{
    teamId: string;
    teamName: string;
    ORI: number | null;
    OVI: number | null;
    quadrant: string | null;
  }>,
) {
  return teams.map((t) => ({
    id: t.teamId,
    label: t.teamName,
    score: t.ORI,
    benchmark: t.OVI,
    gap: t.ORI != null && t.OVI != null ? t.ORI - t.OVI : null,
    status: scoreStatus(t.OVI),
    note: quadrantLabel(t.quadrant),
  }));
}

export function heatmapTone(value: number | null, benchmark = 3.5): string {
  if (value == null) return "bg-black/5 dark:bg-white/10";
  if (value >= 4.2) return "bg-emerald-500/80 text-white";
  if (value >= benchmark) return "bg-emerald-400/50 text-foreground";
  if (value >= 2.5) return "bg-amber-400/50 text-foreground";
  return "bg-red-400/70 text-white";
}

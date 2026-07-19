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
    typology?: string | null;
    priorityManage?: boolean;
    residual?: number | null;
  }>,
) {
  return teams.map((t) => {
    const typeLabel = t.typology ? quadrantLabel(t.typology) : quadrantLabel(t.quadrant);
    const flags = [
      t.priorityManage ? "우선관리" : null,
      t.residual != null ? `e=${t.residual.toFixed(2)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: t.teamId,
      label: t.teamName,
      score: t.ORI,
      benchmark: t.OVI,
      gap: t.ORI != null && t.OVI != null ? t.ORI - t.OVI : null,
      status: scoreStatus(t.OVI),
      note: flags ? `${typeLabel} · ${flags}` : typeLabel,
    };
  });
}

export function heatmapTone(value: number | null, benchmark = 3.5): string {
  if (value == null) return "bg-black/5 dark:bg-white/10";
  if (value >= 4.2) return "bg-emerald-500/80 text-white";
  if (value >= benchmark) return "bg-emerald-400/50 text-foreground";
  if (value >= 2.5) return "bg-amber-400/50 text-foreground";
  return "bg-red-400/70 text-white";
}

export type OrgBenchmarks = ReturnType<typeof computeOrgBenchmarks>;
export type BenchmarkMode = "org" | "parent" | "peers";

export type OrgBiMetricCell = {
  value: number | null;
  gap: number | null;
  status: ReturnType<typeof scoreStatus>;
};

export type OrgBiMatrixRow = {
  id: string;
  name: string;
  level: string;
  levelCode?: OrgNode["level"];
  sampleSize: number | null;
  hasChildren: boolean;
  hidden: boolean;
  isCurrent: boolean;
  isSiblingView: boolean;
  rank: number;
  composite: number | null;
  compositeGap: number | null;
  OHI: OrgBiMetricCell;
  ORI: OrgBiMetricCell;
  OVI: OrgBiMetricCell;
  OAI: OrgBiMetricCell;
};

const AXIS_KEYS = ["OHI", "ORI", "OVI", "OAI"] as const;
export type OrgAxisKey = (typeof AXIS_KEYS)[number];

function metricCell(
  value: number | null | undefined,
  bench: number | null | undefined,
): OrgBiMetricCell {
  const v = value ?? null;
  const b = bench ?? null;
  const gap = v != null && b != null ? v - b : null;
  return { value: v, gap, status: scoreStatus(v) };
}

export function resolveBenchmark(
  mode: BenchmarkMode,
  contextNode: OrgNode | null,
  tree: OrgTreeIndex,
  orgBenchmarks: OrgBenchmarks,
  matrixNodes: OrgNode[],
  isSiblingView: boolean,
): { benchmarks: OrgBenchmarks; label: string } {
  if (mode === "org") {
    return { benchmarks: orgBenchmarks, label: "전사 평균" };
  }
  if (mode === "parent") {
    if (isSiblingView && contextNode?.parentId) {
      const parent = tree.byId.get(contextNode.parentId);
      const fromParent = nodeToBenchmarks(parent);
      if (fromParent && parent) {
        return { benchmarks: fromParent, label: `${parent.teamName} (상위)` };
      }
    }
    if (contextNode && !contextNode.hidden && !isSiblingView) {
      const fromNode = nodeToBenchmarks(contextNode);
      if (fromNode) {
        return { benchmarks: fromNode, label: `${contextNode.teamName} (현재)` };
      }
    }
    return { benchmarks: orgBenchmarks, label: "전사 평균" };
  }
  const peers = matrixNodes.filter((n) => !n.hidden);
  return {
    benchmarks: computeOrgBenchmarks(peers.length ? peers : matrixNodes),
    label: "동급 평균",
  };
}

/** BI 매트릭스에 표시할 행 — 하위 조직 없으면 동급(형제) 조직으로 폴백 */
export function getMatrixScopeNodes(
  drillId: string | null,
  tree: OrgTreeIndex,
): { nodes: OrgNode[]; isSiblingView: boolean } {
  const children = getDirectChildren(drillId, tree, false);
  if (children.length > 0) return { nodes: children, isSiblingView: false };
  if (!drillId) return { nodes: [], isSiblingView: false };
  const current = tree.byId.get(drillId);
  if (!current) return { nodes: [], isSiblingView: false };
  const siblings = getDirectChildren(current.parentId ?? null, tree, false);
  return { nodes: siblings, isSiblingView: siblings.length > 0 };
}

export function buildOrgBiMatrixRows(
  nodes: OrgNode[],
  benchmarks: OrgBenchmarks,
  tree: OrgTreeIndex,
  options: {
    drillId: string | null;
    isSiblingView: boolean;
  },
): OrgBiMatrixRow[] {
  const sorted = [...nodes].sort((a, b) => (b.OHI ?? 0) - (a.OHI ?? 0));
  return sorted.map((n, idx) => {
    const composite = avgNullable([n.OHI, n.ORI, n.OVI, n.OAI]);
    const benchComposite = avgNullable([benchmarks.OHI, benchmarks.ORI, benchmarks.OVI, benchmarks.OAI]);
    return {
      id: n.teamId,
      name: n.teamName,
      level: orgLevelLabel(n.level),
      levelCode: n.level,
      sampleSize: n.sampleSize ?? null,
      hasChildren: hasOrgChildren(n.teamId, tree),
      hidden: n.hidden,
      isCurrent: n.teamId === options.drillId,
      isSiblingView: options.isSiblingView,
      rank: idx + 1,
      composite,
      compositeGap: composite != null && benchComposite != null ? composite - benchComposite : null,
      OHI: metricCell(n.OHI, benchmarks.OHI),
      ORI: metricCell(n.ORI, benchmarks.ORI),
      OVI: metricCell(n.OVI, benchmarks.OVI),
      OAI: metricCell(n.OAI, benchmarks.OAI),
    };
  });
}

export function buildContextKpiRows(
  node: OrgNode | null,
  orgScores: OrgBenchmarks | undefined,
  orgBenchmarks: OrgBenchmarks,
  benchmark: OrgBenchmarks,
  benchmarkLabel: string,
): AnalysisRow[] {
  const scores = node && !node.hidden
    ? { OHI: node.OHI ?? null, ORI: node.ORI ?? null, OVI: node.OVI ?? null, OAI: node.OAI ?? null }
    : orgScores ?? orgBenchmarks;

  return (["OHI", "ORI", "OVI", "OAI"] as const).map((axis) => {
    const score = scores[axis];
    const bench = benchmark[axis];
    const g = score != null && bench != null ? score - bench : null;
    return {
      id: axis,
      label: axis,
      score,
      benchmark: bench,
      gap: g,
      status: scoreStatus(score),
      note: g != null ? (g >= 0 ? `${benchmarkLabel} 이상` : `${benchmarkLabel} 미만`) : "—",
    };
  });
}

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
  levelFilter?: "DIVISION" | "UNIT" | "TEAM" | null,
): AnalysisRow[] {
  const filtered = nodes
    .filter((n) => !n.hidden)
    .filter((n) => !levelFilter || n.level === levelFilter)
    .sort((a, b) => (b.OHI ?? 0) - (a.OHI ?? 0));

  return filtered.map((n) => {
    const composite = avgNullable([n.OHI, n.ORI, n.OVI, n.OAI]);
    const bench = avgNullable([benchmarks.OHI, benchmarks.ORI, benchmarks.OVI, benchmarks.OAI]);
    const vsOrg = composite != null && bench != null ? composite - bench : null;
    const parts = [
      n.OHI != null ? `OHI ${n.OHI.toFixed(2)}` : null,
      n.ORI != null ? `ORI ${n.ORI.toFixed(2)}` : null,
      n.OVI != null ? `OVI ${n.OVI.toFixed(2)}` : null,
      n.OAI != null ? `OAI ${n.OAI.toFixed(2)}` : null,
      n.sampleSize != null ? `N=${n.sampleSize}` : null,
    ].filter(Boolean);
    return {
      id: n.teamId,
      label: `${orgLevelLabel(n.level)} · ${n.teamName}`,
      score: composite,
      benchmark: bench,
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

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  MetricTile,
  QuadrantLegend,
  QUADRANT_FILL,
} from "@/components/admin/diagnostic/ArcReportUi";
import { AnalysisTable } from "@/components/admin/diagnostic/ArcAnalysisUi";
import {
  buildDriverVarianceRows,
  buildOrgAxisDetailRows,
  buildOrgComparisonRows,
  buildOrgTreeIndex,
  collectSubtreeLeafIds,
  computeOrgBenchmarks,
  gapMatrixRows,
  getDirectChildren,
  hasOrgChildren,
  heatmapTone,
  nodeToBenchmarks,
  orgBreadcrumbPath,
  orgLevelLabel,
  type OrgNode,
} from "@/lib/diagnostic/org-analysis";
import { DRIVER_LABELS } from "@/lib/diagnostic/report-narratives";
import { quadrantLabel } from "@/lib/diagnostic/report-narratives";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

export function OrgReportSection({
  waveId,
  teams,
  gapMatrix,
  isEnabled,
  orgScores,
}: {
  waveId: string;
  teams: OrgNode[];
  gapMatrix?: {
    mode: string;
    xBase?: number | null;
    yBase?: number | null;
    teams?: Array<{
      teamId: string;
      teamName: string;
      ORI: number | null;
      OVI: number | null;
      quadrant: string | null;
    }>;
  } | null;
  isEnabled: (code: string) => boolean;
  orgScores?: {
    ohi: number | null;
    ori: number | null;
    ovi: number | null;
    oai: number | null;
  };
}) {
  const [drillId, setDrillId] = useState<string | null>(null);

  const orgBenchmarks = useMemo(() => computeOrgBenchmarks(teams), [teams]);
  const tree = useMemo(() => buildOrgTreeIndex(teams), [teams]);
  const breadcrumb = useMemo(() => orgBreadcrumbPath(drillId, tree.byId), [drillId, tree.byId]);
  const current = drillId ? tree.byId.get(drillId) : null;
  const drillChildren = useMemo(
    () => getDirectChildren(drillId, tree, false),
    [drillId, tree],
  );
  const visibleDrillChildren = useMemo(
    () => drillChildren.filter((n) => !n.hidden),
    [drillChildren],
  );

  const contextBenchmarks = useMemo(() => {
    if (current && !current.hidden) {
      const fromNode = nodeToBenchmarks(current);
      if (fromNode) return fromNode;
    }
    return orgBenchmarks;
  }, [current, orgBenchmarks]);

  const comparisonRows = useMemo(
    () =>
      buildOrgComparisonRows(teams, orgBenchmarks, {
        parentId: drillId,
        contextBenchmarks,
      }),
    [teams, orgBenchmarks, drillId, contextBenchmarks],
  );

  const subtreeLeafIds = useMemo(
    () => collectSubtreeLeafIds(drillId, tree, teams),
    [drillId, tree, teams],
  );
  const subtreeLeaves = useMemo(
    () => teams.filter((n) => subtreeLeafIds.has(n.teamId) && !n.hidden),
    [teams, subtreeLeafIds],
  );

  const barData = visibleDrillChildren.map((t) => ({
    id: t.teamId,
    name: t.teamName.length > 8 ? `${t.teamName.slice(0, 7)}…` : t.teamName,
    fullName: t.teamName,
    OHI: t.OHI ?? 0,
    ORI: t.ORI ?? 0,
    OVI: t.OVI ?? 0,
    OAI: t.OAI ?? 0,
  }));

  const gapTeams = useMemo(() => {
    const all = gapMatrix?.teams?.filter((t) => t.ORI != null && t.OVI != null) ?? [];
    if (drillId == null) return all;
    return all.filter((t) => subtreeLeafIds.has(t.teamId));
  }, [gapMatrix, drillId, subtreeLeafIds]);

  const driverVarianceRows = useMemo(
    () => buildDriverVarianceRows(subtreeLeaves, DRIVER_LABELS),
    [subtreeLeaves],
  );

  const heatmapAxes = useMemo(() => {
    const axes: Array<{ key: string; label: string; enabled: boolean }> = [
      { key: "OHI", label: "OHI", enabled: isEnabled("OHI") },
      { key: "ORI", label: "ORI", enabled: isEnabled("ORI") },
      { key: "OVI", label: "OVI", enabled: isEnabled("OVI") },
      { key: "OAI", label: "OAI", enabled: isEnabled("OAI") },
    ];
    return axes.filter((a) => a.enabled);
  }, [isEnabled]);

  const heatmapRows = visibleDrillChildren;

  const radarCompare = useMemo(() => {
    const pool = [...visibleDrillChildren].sort((a, b) => (b.OHI ?? 0) - (a.OHI ?? 0));
    if (pool.length < 2) return null;
    const top = pool[0];
    const bottom = pool[pool.length - 1];
    const mk = (n: OrgNode, tag: string) => ({
      org: `${tag} ${n.teamName}`,
      OHI: n.OHI ?? 0,
      ORI: n.ORI ?? 0,
      OVI: n.OVI ?? 0,
      OAI: n.OAI ?? 0,
    });
    return [mk(top, "최고"), mk(bottom, "최저")];
  }, [visibleDrillChildren]);

  const rollUp = () => {
    if (!current?.parentId) setDrillId(null);
    else setDrillId(current.parentId);
  };

  const headerScores = current && !current.hidden
    ? { ohi: current.OHI, ori: current.ORI, ovi: current.OVI, oai: current.OAI }
    : orgScores ?? {
        ohi: orgBenchmarks.OHI,
        ori: orgBenchmarks.ORI,
        ovi: orgBenchmarks.OVI,
        oai: orgBenchmarks.OAI,
      };

  const contextTitle = current
    ? `${orgLevelLabel(current.level)} · ${current.teamName}`
    : "전사 종합";

  if (teams.length === 0) {
    return (
      <div className="card-luxe space-y-3 p-6 text-center">
        <p className="text-sm text-muted">팀별 링크를 발급하면 조직별 비교가 활성화됩니다.</p>
        <Link href={`/admin/diagnostic/waves/${waveId}#team-links`} className="btn-primary inline-flex px-4 py-2 text-sm">
          팀별 링크 추가
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card-luxe print-hide space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">조직 탐색 — 드릴다운 · 롤업</p>
          {drillId && (
            <button type="button" className="nav-pill text-xs" onClick={rollUp}>
              ↑ 상위로
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <button
            type="button"
            className={`nav-pill text-xs ${drillId === null ? "nav-pill-active" : ""}`}
            onClick={() => setDrillId(null)}
          >
            전사 종합
          </button>
          {breadcrumb.map((node) => (
            <span key={node.teamId} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted" aria-hidden />
              <button
                type="button"
                className={`nav-pill text-xs ${drillId === node.teamId ? "nav-pill-active" : ""}`}
                onClick={() => setDrillId(node.teamId)}
              >
                {orgLevelLabel(node.level)} · {node.teamName}
              </button>
            </span>
          ))}
        </div>
        <p className="text-[11px] text-muted">
          현재 보기: <span className="font-medium text-foreground">{contextTitle}</span>
          {visibleDrillChildren.length > 0
            ? ` · 하위 ${visibleDrillChildren.length}개 조직`
            : drillId
              ? " · 최하위(팀) 수준"
              : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isEnabled("OHI") && (
          <MetricTile
            label={current ? "OHI" : "전사 OHI"}
            value={headerScores.ohi}
            hint={current ? `N=${current.sampleSize ?? "—"}` : "조직 평균"}
          />
        )}
        {isEnabled("ORI") && (
          <MetricTile label={current ? "ORI" : "전사 ORI"} value={headerScores.ori} hint={current ? contextTitle : "조직 평균"} />
        )}
        {isEnabled("OVI") && (
          <MetricTile label={current ? "OVI" : "전사 OVI"} value={headerScores.ovi} hint={current ? contextTitle : "조직 평균"} />
        )}
        {isEnabled("OAI") && (
          <MetricTile label={current ? "OAI" : "전사 OAI"} value={headerScores.oai} hint={current ? contextTitle : "조직 평균"} />
        )}
      </div>

      {current && !current.hidden && (
        <AnalysisTable
          title={`${contextTitle} — 전사 대비`}
          subtitle="현재 선택 조직의 4축 위치"
          rows={buildOrgAxisDetailRows(current, orgBenchmarks)}
        />
      )}

      {current?.hidden && (
        <div className="card-luxe p-4 text-sm text-muted">
          표본 부족 — 최소 5명 필요 (현재 N={current.sampleSize ?? 0})
        </div>
      )}

      {comparisonRows.length > 0 && (
        <AnalysisTable
          title={drillId ? `${contextTitle} 하위 조직 비교` : "최상위 조직 4축 비교"}
          subtitle={
            drillId
              ? `하위 ${comparisonRows.length}개 · ${current ? "상위 조직" : "전사"} 대비 종합 격차`
              : `표시 ${comparisonRows.length}개 · 전사 대비`
          }
          rows={comparisonRows}
        />
      )}

      {visibleDrillChildren.length > 0 && (
        <ul className="print-hide space-y-2">
          <li className="px-1 text-xs font-semibold text-muted">하위 조직 — 클릭하여 드릴다운</li>
          {drillChildren.map((t) => {
            const childCount = (tree.childrenOf.get(t.teamId) ?? []).length;
            const canDrill = childCount > 0 || t.level !== "TEAM";
            return (
              <li key={t.teamId} className={`card-luxe p-4 text-sm ${t.hidden ? "opacity-50" : ""}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setDrillId(t.teamId)}
                >
                  <span className="font-medium text-foreground">
                    <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-muted dark:bg-white/10">
                      {orgLevelLabel(t.level)}
                    </span>
                    {t.teamName}
                    {canDrill && hasOrgChildren(t.teamId, tree) && (
                      <ChevronRight className="ml-1 inline h-3.5 w-3.5 text-muted" aria-hidden />
                    )}
                  </span>
                  {t.hidden ? (
                    <span className="text-muted">표본 부족</span>
                  ) : (
                    <span className="shrink-0 text-muted">
                      OHI {t.OHI?.toFixed(2) ?? "—"} · N={t.sampleSize ?? "—"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {drillId && visibleDrillChildren.length === 0 && !current?.hidden && (
        <p className="text-sm text-muted">하위 조직이 없습니다. (팀 단위)</p>
      )}

      {heatmapAxes.length > 0 && heatmapRows.length > 0 && (
        <div className="card-luxe overflow-x-auto p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {drillId ? `${contextTitle} 하위` : "최상위"} 조직 × 축 히트맵
          </h3>
          <p className="mt-0.5 text-xs text-muted">행 클릭 → 하위 드릴다운 · 색이 진할수록 점수 높음</p>
          <table className="mt-3 min-w-[480px] w-full text-xs">
            <thead>
              <tr className="border-b border-black/10 text-muted dark:border-white/10">
                <th className="py-2 pr-3 text-left">조직</th>
                {heatmapAxes.map((a) => (
                  <th key={a.key} className="px-2 py-2 text-center">
                    {a.label}
                  </th>
                ))}
                <th className="py-2 pl-2 text-right">N</th>
              </tr>
            </thead>
            <tbody>
              {heatmapRows.map((row) => (
                <tr
                  key={row.teamId}
                  className="border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="text-left font-medium text-foreground hover:text-accent print:pointer-events-none"
                      onClick={() => setDrillId(row.teamId)}
                    >
                      <span className="text-muted">{orgLevelLabel(row.level)} · </span>
                      {row.teamName}
                      {hasOrgChildren(row.teamId, tree) && (
                        <ChevronRight className="ml-0.5 inline h-3 w-3 text-muted" aria-hidden />
                      )}
                    </button>
                  </td>
                  {heatmapAxes.map((a) => {
                    const val =
                      a.key === "OHI"
                        ? row.OHI
                        : a.key === "ORI"
                          ? row.ORI
                          : a.key === "OVI"
                            ? row.OVI
                            : row.OAI;
                    return (
                      <td key={a.key} className="px-2 py-2 text-center">
                        <span
                          className={`inline-block min-w-[2.5rem] rounded-md px-2 py-1 tabular-nums ${heatmapTone(val ?? null)}`}
                        >
                          {val?.toFixed(2) ?? "—"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-2 pl-2 text-right tabular-nums text-muted">{row.sampleSize ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {barData.length >= 2 && (
        <div className="card-luxe p-4">
          <h3 className="mb-1 text-sm font-semibold">
            {drillId ? `${contextTitle} 하위` : "최상위 조직"} 4축 막대 비교
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} />
                <Tooltip labelFormatter={(_, p) => (p?.[0]?.payload as { fullName?: string })?.fullName ?? ""} />
                <Legend />
                <ReferenceLine y={3.5} stroke="#94a3b8" strokeDasharray="4 4" />
                {isEnabled("OHI") && <Bar dataKey="OHI" name="OHI" fill="#c9a227" />}
                {isEnabled("ORI") && <Bar dataKey="ORI" name="ORI" fill="#64748b" />}
                {isEnabled("OVI") && <Bar dataKey="OVI" name="OVI" fill="#94a3b8" />}
                {isEnabled("OAI") && <Bar dataKey="OAI" name="OAI" fill="#475569" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {gapMatrix?.mode === "GAP_MATRIX" && gapTeams.length >= 2 && (
        <div className="card-luxe p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Gap 매트릭스 (ORI × OVI)
            {drillId ? ` — ${contextTitle} 하위 팀` : " — 전체 팀"}
          </h3>
          <QuadrantLegend />
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="ORI" domain={[1, 5]} />
                <YAxis type="number" dataKey="OVI" domain={[1, 5]} />
                <ZAxis range={[100, 400]} />
                {gapMatrix.xBase != null && (
                  <ReferenceLine x={gapMatrix.xBase} stroke="#94a3b8" strokeDasharray="4 4" />
                )}
                {gapMatrix.yBase != null && (
                  <ReferenceLine y={gapMatrix.yBase} stroke="#94a3b8" strokeDasharray="4 4" />
                )}
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { teamName?: string; quadrant?: string };
                    return p?.teamName ? `${p.teamName} (${quadrantLabel(p.quadrant ?? null)})` : "";
                  }}
                />
                <Scatter data={gapTeams}>
                  {gapTeams.map((t) => (
                    <Cell key={t.teamId} fill={QUADRANT_FILL[t.quadrant ?? ""] ?? "#c9a227"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <AnalysisTable
            title="팀 Gap 분석표"
            subtitle="ORI(준비) vs OVI(속도)"
            rows={gapMatrixRows(gapTeams)}
          />
        </div>
      )}

      {driverVarianceRows.length > 0 && (
        <AnalysisTable
          title="드라이버 팀간 편차"
          subtitle={
            drillId
              ? `${contextTitle} 하위 팀 — σ가 클수록 팀마다 체감이 다름`
              : "전체 팀 — σ가 클수록 팀마다 체감이 다름"
          }
          rows={driverVarianceRows}
        />
      )}

      {current && !current.hidden && current.drivers && (
        <AnalysisTable
          title={`${contextTitle} 드라이버 현재점수`}
          rows={Object.entries(current.drivers).map(([code, score]) => ({
            id: code,
            label: DRIVER_LABELS[code] ?? code,
            score,
            benchmark: orgBenchmarks.OHI,
            gap: score != null && orgBenchmarks.OHI != null ? score - orgBenchmarks.OHI : null,
            status: score != null ? (score >= 3.5 ? "양호" : score >= 2.5 ? "보통" : "주의") : null,
            note: "",
          }))}
        />
      )}

      {radarCompare && radarCompare.length >= 2 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">
            {drillId ? `${contextTitle} 하위` : "전사"} OHI 최고 vs 최저
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={heatmapAxes.map((a) => ({
                  axis: a.label,
                  top: radarCompare[0][a.key as keyof (typeof radarCompare)[0]] as number,
                  bottom: radarCompare[1][a.key as keyof (typeof radarCompare)[1]] as number,
                }))}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <Radar name={radarCompare[0].org} dataKey="top" stroke="#c9a227" fill="#c9a227" fillOpacity={0.3} />
                <Radar name={radarCompare[1].org} dataKey="bottom" stroke="#64748b" fill="#64748b" fillOpacity={0.25} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Link href={`/admin/diagnostic/waves/${waveId}#team-links`} className="print-hide text-xs text-accent hover:underline">
        팀별 링크 관리 →
      </Link>
    </div>
  );
}

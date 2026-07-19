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
import { OrgBiMatrix } from "@/components/admin/diagnostic/OrgBiMatrix";
import { OrgBiNavigator } from "@/components/admin/diagnostic/OrgBiNavigator";
import {
  buildContextKpiRows,
  buildDriverVarianceRows,
  buildOrgBiMatrixRows,
  buildOrgTreeIndex,
  collectSubtreeLeafIds,
  computeOrgBenchmarks,
  gapMatrixRows,
  getDirectChildren,
  getMatrixScopeNodes,
  orgBreadcrumbPath,
  orgLevelLabel,
  resolveBenchmark,
  type BenchmarkMode,
  type OrgAxisKey,
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
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { formatScore, scoreAxisTick } from "@/lib/diagnostic/format-score";

const BENCHMARK_MODES: Array<{ id: BenchmarkMode; label: string }> = [
  { id: "org", label: "전사 평균" },
  { id: "parent", label: "상위 조직" },
  { id: "peers", label: "동급 평균" },
];

export function OrgReportSection({
  waveId,
  organizationId,
  teams,
  gapMatrix,
  isEnabled,
  orgScores,
}: {
  waveId: string;
  organizationId?: string | null;
  teams: OrgNode[];
  gapMatrix?: {
    mode: string;
    xBase?: number | null;
    yBase?: number | null;
    intercept?: number | null;
    slope?: number | null;
    rSquared?: number | null;
    n?: number | null;
    note?: string | null;
    teams?: Array<{
      teamId: string;
      teamName: string;
      ORI: number | null;
      OVI: number | null;
      quadrant: string | null;
      typology?: string | null;
      priorityManage?: boolean;
      residual?: number | null;
      fastErrorWarning?: boolean;
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
  const waveDetailHref = organizationId
    ? `/admin/organizations/${organizationId}/waves/${waveId}`
    : `/admin/diagnostic/waves/${waveId}`;
  const [drillId, setDrillId] = useState<string | null>(null);
  const [benchmarkMode, setBenchmarkMode] = useState<BenchmarkMode>("parent");

  const orgBenchmarks = useMemo(() => computeOrgBenchmarks(teams), [teams]);
  const tree = useMemo(() => buildOrgTreeIndex(teams), [teams]);
  const rootNodes = useMemo(() => getDirectChildren(null, tree, false), [tree]);
  const breadcrumb = useMemo(() => orgBreadcrumbPath(drillId, tree.byId), [drillId, tree.byId]);
  const current = drillId ? tree.byId.get(drillId) : null;

  const matrixScope = useMemo(() => getMatrixScopeNodes(drillId, tree), [drillId, tree]);
  const visibleMatrixNodes = useMemo(
    () => matrixScope.nodes.filter((n) => !n.hidden),
    [matrixScope.nodes],
  );

  const activeBenchmark = useMemo(
    () =>
      resolveBenchmark(
        benchmarkMode,
        current ?? null,
        tree,
        orgBenchmarks,
        matrixScope.nodes,
        matrixScope.isSiblingView,
      ),
    [benchmarkMode, current, tree, orgBenchmarks, matrixScope],
  );

  const biMatrixRows = useMemo(
    () =>
      buildOrgBiMatrixRows(matrixScope.nodes, activeBenchmark.benchmarks, tree, {
        drillId,
        isSiblingView: matrixScope.isSiblingView,
      }),
    [matrixScope, activeBenchmark.benchmarks, tree, drillId],
  );

  const subtreeLeafIds = useMemo(
    () => collectSubtreeLeafIds(drillId, tree, teams),
    [drillId, tree, teams],
  );
  const subtreeLeaves = useMemo(
    () => teams.filter((n) => subtreeLeafIds.has(n.teamId) && !n.hidden),
    [teams, subtreeLeafIds],
  );

  const enabledAxes = useMemo(
    () =>
      (["OHI", "ORI", "OVI", "OAI"] as OrgAxisKey[]).filter((a) => isEnabled(a)),
    [isEnabled],
  );

  const barData = visibleMatrixNodes.map((t) => ({
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

  const contextKpiRows = useMemo(
    () =>
      buildContextKpiRows(
        current ?? null,
        orgScores
          ? { OHI: orgScores.ohi, ORI: orgScores.ori, OVI: orgScores.ovi, OAI: orgScores.oai }
          : undefined,
        orgBenchmarks,
        activeBenchmark.benchmarks,
        activeBenchmark.label,
      ).filter((r) => enabledAxes.includes(r.id as OrgAxisKey)),
    [current, orgScores, orgBenchmarks, activeBenchmark, enabledAxes],
  );

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

  const matrixTitle = matrixScope.isSiblingView
    ? `${contextTitle} — 동급 조직 벤치마킹`
    : drillId
      ? `${contextTitle} — 하위 조직`
      : "최상위 조직";

  const matrixSubtitle = matrixScope.isSiblingView
    ? `같은 상위 아래 ${biMatrixRows.length}개 조직 · ${activeBenchmark.label} 대비`
    : `하위 ${biMatrixRows.length}개 · ${activeBenchmark.label} 대비 · 행 클릭 시 드릴다운`;

  if (teams.length === 0) {
    return (
      <div className="card-luxe space-y-3 p-6 text-center">
        <p className="text-sm text-muted">팀별 링크를 발급하면 조직별 비교가 활성화됩니다.</p>
        <Link href={`${waveDetailHref}#team-links`} className="btn-primary inline-flex px-4 py-2 text-sm">
          팀별 링크 추가
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card-luxe print-hide space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-foreground">조직 BI 탐색</p>
            <p className="text-[11px] text-muted">계층 드릴다운 · 롤업 · 벤치마크 비교</p>
          </div>
          {drillId && (
            <button type="button" className="nav-pill text-xs" onClick={rollUp}>
              ↑ 상위로 롤업
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted">벤치마크 기준</span>
          {BENCHMARK_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`nav-pill text-xs ${benchmarkMode === m.id ? "nav-pill-active" : ""}`}
              onClick={() => setBenchmarkMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(200px,260px)_1fr]">
        <OrgBiNavigator
          drillId={drillId}
          tree={tree}
          rootNodes={rootNodes}
          onSelect={setDrillId}
          onSelectRoot={() => setDrillId(null)}
        />

        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isEnabled("OHI") && (
              <MetricTile
                label={current ? "OHI" : "전사 OHI"}
                value={headerScores.ohi}
                hint={current ? `N=${current.sampleSize ?? "—"}` : activeBenchmark.label}
              />
            )}
            {isEnabled("ORI") && (
              <MetricTile label={current ? "ORI" : "전사 ORI"} value={headerScores.ori} hint={contextTitle} />
            )}
            {isEnabled("OVI") && (
              <MetricTile label={current ? "OVI" : "전사 OVI"} value={headerScores.ovi} hint={contextTitle} />
            )}
            {isEnabled("OAI") && (
              <MetricTile label={current ? "OAI" : "전사 OAI"} value={headerScores.oai} hint={contextTitle} />
            )}
          </div>

          {contextKpiRows.length > 0 && (
            <AnalysisTable
              title={`${contextTitle} — ${activeBenchmark.label} 벤치마킹`}
              subtitle="현재 조직(또는 전사)의 4축 위치"
              rows={contextKpiRows}
            />
          )}

          {current?.hidden && (
            <div className="card-luxe p-4 text-sm text-muted">
              표본 부족 — 최소 5명 필요 (현재 N={current.sampleSize ?? 0})
            </div>
          )}

          <OrgBiMatrix
            title={matrixTitle}
            subtitle={matrixSubtitle}
            benchmarkLabel={activeBenchmark.label}
            rows={biMatrixRows}
            enabledAxes={enabledAxes}
            onDrill={setDrillId}
          />

          {barData.length >= 2 && (
            <div className="card-luxe p-4">
              <h3 className="mb-1 text-sm font-semibold">{matrixTitle} — 4축 막대</h3>
              <p className="mb-3 text-xs text-muted">기준선 3.5 · {activeBenchmark.label}</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[1, 5]} tickFormatter={scoreAxisTick} />
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
                {drillId ? ` — ${contextTitle} 범위` : " — 전체 팀"}
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
                        const p = payload?.[0]?.payload as {
                          teamName?: string;
                          quadrant?: string;
                          typology?: string;
                        };
                        if (!p?.teamName) return "";
                        const label = p.typology
                          ? quadrantLabel(p.typology)
                          : quadrantLabel(p.quadrant ?? null);
                        return `${p.teamName} (${label})`;
                      }}
                    />
                    <Scatter data={gapTeams}>
                      {gapTeams.map((t) => (
                        <Cell
                          key={t.teamId}
                          fill={
                            t.priorityManage
                              ? "#ef4444"
                              : (QUADRANT_FILL[t.quadrant ?? ""] ?? "#c9a227")
                          }
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <AnalysisTable
                title="팀 Gap 분석표"
                subtitle="ORI(준비) vs OVI(속도) · Gap² TOP3 우선관리 · OHI로 Crash/Super-Star/Apathy/Cartel 세분"
                rows={gapMatrixRows(gapTeams)}
              />
            </div>
          )}

          {gapMatrix?.mode === "OLS_RESIDUAL" && gapTeams.length >= 2 && (
            <div className="card-luxe p-4">
              <h3 className="mb-1 text-sm font-semibold">
                OLS 잔차 분석 (ORI → OVI)
                {drillId ? ` — ${contextTitle} 범위` : " — 전체 팀"}
              </h3>
              <p className="mb-3 text-xs text-muted">
                {gapMatrix.note}
                {gapMatrix.rSquared != null ? ` · R²=${formatScore(gapMatrix.rSquared)}` : ""}
                {gapMatrix.n != null ? ` · n=${gapMatrix.n}` : ""}
              </p>
              <div className="mt-3 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="ORI" domain={[1, 5]} />
                    <YAxis type="number" dataKey="OVI" domain={[1, 5]} />
                    <ZAxis range={[100, 400]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as {
                          teamName?: string;
                          typology?: string;
                          residual?: number;
                        };
                        return p?.teamName
                          ? `${p.teamName} · ${quadrantLabel(p.typology ?? null)} · e=${formatScore(p.residual ?? null)}`
                          : "";
                      }}
                    />
                    <Scatter data={gapTeams}>
                      {gapTeams.map((t) => (
                        <Cell
                          key={t.teamId}
                          fill={
                            t.priorityManage
                              ? "#ef4444"
                              : t.fastErrorWarning
                                ? "#f59e0b"
                                : "#c9a227"
                          }
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <AnalysisTable
                title="팀 OLS 잔차 분석표"
                subtitle="e² 상위 25% 우선관리 · 잔차×OHI 유형 · OVI≥3.5·OAI≤2.8 빠른오류"
                rows={gapMatrixRows(gapTeams)}
              />
            </div>
          )}

          {driverVarianceRows.length > 0 && (
            <AnalysisTable
              title="드라이버 팀간 편차"
              subtitle={`${contextTitle} 범위 · σ가 클수록 팀마다 체감이 다름`}
              rows={driverVarianceRows}
            />
          )}

          {current && !current.hidden && current.drivers && (
            <AnalysisTable
              title={`${contextTitle} 드라이버`}
              subtitle={`${activeBenchmark.label} 대비 (OHI 축 기준선)`}
              rows={Object.entries(current.drivers).map(([code, score]) => ({
                id: code,
                label: DRIVER_LABELS[code] ?? code,
                score,
                benchmark: activeBenchmark.benchmarks.OHI,
                gap:
                  score != null && activeBenchmark.benchmarks.OHI != null
                    ? score - activeBenchmark.benchmarks.OHI
                    : null,
                status: score != null ? (score >= 3.5 ? "양호" : score >= 2.5 ? "보통" : "주의") : null,
                note: "",
              }))}
            />
          )}
        </div>
      </div>

      <Link href={`${waveDetailHref}#team-links`} className="print-hide text-xs text-accent hover:underline">
        팀별 링크 관리 →
      </Link>
    </div>
  );
}

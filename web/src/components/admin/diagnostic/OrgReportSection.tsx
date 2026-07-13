"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  computeOrgBenchmarks,
  gapMatrixRows,
  heatmapTone,
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

type LevelFilter = "ALL" | "DIVISION" | "UNIT" | "TEAM";

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
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const benchmarks = useMemo(() => computeOrgBenchmarks(teams), [teams]);
  const visibleTeams = teams.filter((t) => !t.hidden);
  const leafTeams = visibleTeams.filter((t) => t.level === "TEAM");

  const filteredLevel = levelFilter === "ALL" ? null : levelFilter;
  const comparisonRows = useMemo(
    () => buildOrgComparisonRows(teams, benchmarks, filteredLevel),
    [teams, benchmarks, filteredLevel],
  );

  const selected = selectedId ? teams.find((t) => t.teamId === selectedId) : null;
  const childrenOf = (parentId: string | null) =>
    teams.filter((t) => (t.parentId ?? null) === parentId);
  const drillChildren = selectedId ? childrenOf(selectedId).filter((t) => !t.hidden) : visibleTeams.filter((t) => !t.parentId);

  const barData = drillChildren.map((t) => ({
    name: t.teamName.length > 8 ? `${t.teamName.slice(0, 7)}…` : t.teamName,
    fullName: t.teamName,
    OHI: t.OHI ?? 0,
    ORI: t.ORI ?? 0,
    OVI: t.OVI ?? 0,
    OAI: t.OAI ?? 0,
  }));

  const gapTeams = gapMatrix?.teams?.filter((t) => t.ORI != null && t.OVI != null) ?? [];

  const driverVarianceRows = useMemo(
    () => buildDriverVarianceRows(leafTeams, DRIVER_LABELS),
    [leafTeams],
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

  const heatmapRows = useMemo(() => {
    const rows = levelFilter === "TEAM" || levelFilter === "ALL" ? leafTeams : visibleTeams.filter((t) => t.level === levelFilter);
    return rows.filter((t) => !t.hidden).slice(0, 20);
  }, [leafTeams, visibleTeams, levelFilter]);

  const radarCompare = useMemo(() => {
    const pool = [...visibleTeams].sort((a, b) => (b.OHI ?? 0) - (a.OHI ?? 0));
    const top = pool[0];
    const bottom = pool[pool.length - 1];
    if (!top || pool.length < 2) return null;
    const mk = (n: OrgNode, tag: string) => ({
      org: `${tag} ${n.teamName}`,
      OHI: n.OHI ?? 0,
      ORI: n.ORI ?? 0,
      OVI: n.OVI ?? 0,
      OAI: n.OAI ?? 0,
    });
    return [mk(top, "최고"), mk(bottom, "최저")];
  }, [visibleTeams]);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isEnabled("OHI") && (
          <MetricTile label="전사 OHI" value={orgScores?.ohi ?? benchmarks.OHI} hint="조직 평균" />
        )}
        {isEnabled("ORI") && (
          <MetricTile label="전사 ORI" value={orgScores?.ori ?? benchmarks.ORI} hint="조직 평균" />
        )}
        {isEnabled("OVI") && (
          <MetricTile label="전사 OVI" value={orgScores?.ovi ?? benchmarks.OVI} hint="조직 평균" />
        )}
        {isEnabled("OAI") && (
          <MetricTile label="전사 OAI" value={orgScores?.oai ?? benchmarks.OAI} hint="조직 평균" />
        )}
      </div>

      <div className="flex flex-wrap gap-2 print-hide">
        {(
          [
            ["ALL", "전체"],
            ["DIVISION", "사업본부"],
            ["UNIT", "사업부"],
            ["TEAM", "팀"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`nav-pill text-xs ${levelFilter === key ? "nav-pill-active" : ""}`}
            onClick={() => {
              setLevelFilter(key);
              setSelectedId(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <AnalysisTable
        title="조직별 4축 비교표"
        subtitle={`표시 ${comparisonRows.length}개 조직 · 전사 대비 종합 격차`}
        rows={comparisonRows}
      />

      {heatmapAxes.length > 0 && heatmapRows.length > 0 && (
        <div className="card-luxe overflow-x-auto p-4">
          <h3 className="text-sm font-semibold text-foreground">조직 × 축 히트맵</h3>
          <p className="mt-0.5 text-xs text-muted">색이 진할수록 점수 높음 · 빨강=주의 구간</p>
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
                <tr key={row.teamId} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-2 pr-3">
                    <button
                      type="button"
                      className="text-left font-medium text-foreground hover:text-accent print:pointer-events-none"
                      onClick={() => setSelectedId(row.teamId)}
                    >
                      <span className="text-muted">{orgLevelLabel(row.level)} · </span>
                      {row.teamName}
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
            {selected ? `${orgLevelLabel(selected.level)} · ${selected.teamName} 하위` : "최상위 조직"} 4축 비교
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
          <h3 className="mb-2 text-sm font-semibold">팀 Gap 매트릭스 (ORI × OVI)</h3>
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
          subtitle="리프(팀) 수준 — σ가 클수록 팀마다 체감이 다름"
          rows={driverVarianceRows}
        />
      )}

      {selected && !selected.hidden && (
        <div className="card-luxe space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              선택 조직 — {orgLevelLabel(selected.level)} · {selected.teamName}
            </h3>
            <span className="text-xs text-muted">N={selected.sampleSize ?? "—"}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {isEnabled("OHI") && <MetricTile label="OHI" value={selected.OHI} />}
            {isEnabled("ORI") && <MetricTile label="ORI" value={selected.ORI} />}
            {isEnabled("OVI") && <MetricTile label="OVI" value={selected.OVI} />}
            {isEnabled("OAI") && <MetricTile label="OAI" value={selected.OAI} />}
          </div>
          <AnalysisTable
            title="선택 조직 4축 — 전사 대비"
            rows={buildOrgAxisDetailRows(selected, benchmarks)}
          />
          {selected.drivers && (
            <AnalysisTable
              title="선택 조직 드라이버 현재점수"
              rows={Object.entries(selected.drivers).map(([code, score]) => ({
                id: code,
                label: DRIVER_LABELS[code] ?? code,
                score,
                benchmark: benchmarks.OHI,
                gap: score != null && benchmarks.OHI != null ? score - benchmarks.OHI : null,
                status: score != null ? (score >= 3.5 ? "양호" : score >= 2.5 ? "보통" : "주의") : null,
                note: "",
              }))}
            />
          )}
        </div>
      )}

      {radarCompare && radarCompare.length >= 2 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">OHI 최고 vs 최저 조직</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={heatmapAxes.map((a) => ({
                axis: a.label,
                top: radarCompare[0][a.key as keyof typeof radarCompare[0]] as number,
                bottom: radarCompare[1][a.key as keyof typeof radarCompare[1]] as number,
              }))}>
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

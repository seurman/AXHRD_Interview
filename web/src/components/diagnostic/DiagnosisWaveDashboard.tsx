"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DiagnosticLongitudinalPanel } from "@/components/diagnostic/DiagnosticLongitudinalPanel";
import { ScoreHero } from "@/components/admin/diagnostic/ArcReportUi";
import { ArcRadar } from "@/components/admin/diagnostic/ArcRadar";
import { ReportGuideCard, ExecutiveSummaryCard } from "@/components/admin/diagnostic/ReportGuideUi";
import { buildAxisMeaningLine, type AxisCode } from "@/lib/diagnostic/report-guide";
import { buildExecutiveSummaryParts } from "@/lib/diagnostic/report-narratives";
import { formatScore, scoreAxisTick } from "@/lib/diagnostic/format-score";
import { computeCollectionRatePercent } from "@/lib/diagnostic/collection-rate";
import type { ResolvedReportConfig } from "@/lib/diagnostic/report-profile";
import { isSectionEnabledInReport, isTabEnabledInReport } from "@/lib/diagnostic/report-profile";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";

type Props = { waveId: string };

const LEVEL_LABEL: Record<"DIVISION" | "UNIT" | "TEAM", string> = {
  DIVISION: "사업본부",
  UNIT: "사업부",
  TEAM: "팀",
};

type HierarchyNode = {
  id: string;
  name: string;
  level: "DIVISION" | "UNIT" | "TEAM";
  parentId: string | null;
};

type Scores = {
  hidden: boolean;
  reason?: string;
  sampleSize?: number;
  minGroupSize?: number;
  scores?: {
    ohi: { overall: number | null; band: string | null; riskIndex: number | null; drivers: Record<string, { current: number | null; importance: number | null }> };
    ori: { ORI: number | null; band: string | null; opportunity: { band: string; prescription: string } | null; axMaturity: { stage: number; label: string } | null };
    ovi: { OVI: number | null; band: string | null; dynamicCongruenceGap: number | null };
    oai: { OAI: number | null; band: string | null };
    oaiPattern: { pattern: string; message: string } | null;
  };
  teams?: Array<{
    teamId: string;
    teamName: string;
    level?: "DIVISION" | "UNIT" | "TEAM";
    parentId?: string | null;
    sampleSize?: number;
    hidden: boolean;
    ORI?: number | null;
    OVI?: number | null;
    OHI_SE?: number | null;
    OAI?: number | null;
  }>;
  gapMatrix?: {
    mode: string;
    note?: string;
    xBase?: number | null;
    yBase?: number | null;
    teams?: Array<{
      teamId: string;
      teamName: string;
      ORI: number | null;
      OVI: number | null;
      quadrant: string | null;
      priorityManage?: boolean;
      typology?: string | null;
    }>;
  };
};

type WaveMeta = {
  id: string;
  label: string | null;
  waveNumber: number;
  sectionBadge?: string;
  orgWideLink?: string;
  responseCount?: number;
  inviteLinkCount?: number | null;
  enabledSectionCodes: string[] | null;
  reportConfig?: ResolvedReportConfig | null;
  teams: Array<{ id: string; name: string }>;
  hierarchy?: HierarchyNode[];
};

/** 하이어라키를 DFS 순서로 펼치면서 depth를 매긴다 — 들여쓰기 셀렉트용 */
function flattenHierarchy(nodes: HierarchyNode[]): Array<{ node: HierarchyNode; depth: number }> {
  const byParent = new Map<string | null, HierarchyNode[]>();
  for (const n of nodes) {
    const list = byParent.get(n.parentId) ?? [];
    list.push(n);
    byParent.set(n.parentId, list);
  }
  const out: Array<{ node: HierarchyNode; depth: number }> = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const n of byParent.get(parentId) ?? []) {
      out.push({ node: n, depth });
      visit(n.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

function sectionEnabled(code: string, config: ResolvedReportConfig | null | undefined, fallback: string[] | null) {
  if (config) return isSectionEnabledInReport(code, config);
  if (!fallback?.length) return true;
  return fallback.includes(code);
}

export function DiagnosisWaveDashboard({ waveId }: Props) {
  const [tab, setTab] = useState<"overview" | "teams">("overview");
  const [wave, setWave] = useState<WaveMeta | null>(null);
  const [aggregate, setAggregate] = useState<Scores | null>(null);
  const [teamScores, setTeamScores] = useState<Record<string, Scores>>({});
  const [selectedTeam, setSelectedTeam] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);
  const [drillId, setDrillId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [waveRes, scoreRes] = await Promise.all([
      fetch(`/api/org/diagnosis/waves/${waveId}`),
      fetch(`/api/org/diagnosis/waves/${waveId}/scores`),
    ]);
    const waveJson = await waveRes.json();
    const scoreJson = await scoreRes.json();
    if (waveRes.ok) setWave(waveJson.wave);
    setAggregate(scoreJson);
    setLoading(false);
  }, [waveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadTeam = async (teamId: string) => {
    if (teamScores[teamId]) return;
    const res = await fetch(`/api/org/diagnosis/waves/${waveId}/scores?teamId=${teamId}`);
    const json = await res.json();
    setTeamScores((prev) => ({ ...prev, [teamId]: json }));
  };

  useEffect(() => {
    if (selectedTeam !== "all") void loadTeam(selectedTeam);
  }, [selectedTeam, waveId, teamScores]);

  const activeScores =
    selectedTeam === "all" ? aggregate : teamScores[selectedTeam] ?? aggregate;

  const executiveSummary = useMemo(() => {
    if (loading || !wave || !activeScores?.scores || activeScores.hidden) return null;
    const cfg = wave.reportConfig ?? null;
    const enabledAxes = (["OHI", "ORI", "OVI", "OAI"] as AxisCode[]).filter((c) =>
      sectionEnabled(c, cfg, wave.enabledSectionCodes),
    );
    return buildExecutiveSummaryParts({
      scores: {
        ohi: {
          overall: activeScores.scores.ohi.overall,
          riskIndex: activeScores.scores.ohi.riskIndex,
          band: activeScores.scores.ohi.band,
          drivers: activeScores.scores.ohi.drivers,
        },
        ori: {
          ORI: activeScores.scores.ori.ORI,
          band: activeScores.scores.ori.band,
        },
        ovi: {
          OVI: activeScores.scores.ovi.OVI,
          band: activeScores.scores.ovi.band,
          dynamicCongruenceGap: activeScores.scores.ovi.dynamicCongruenceGap,
        },
        oai: {
          OAI: activeScores.scores.oai.OAI,
          band: activeScores.scores.oai.band,
        },
        oaiPattern: activeScores.scores.oaiPattern,
      },
      sampleSize: activeScores.sampleSize ?? 0,
      collectionRate: computeCollectionRatePercent(
        wave.responseCount ?? activeScores.sampleSize ?? 0,
        wave.inviteLinkCount ?? 0,
      ),
      inviteLinkCount: wave.inviteLinkCount ?? null,
      waveLabel: wave.label,
      waveNumber: wave.waveNumber,
      enabledAxes,
    });
  }, [activeScores, wave, loading]);

  if (loading) return <p className="text-sm text-muted">집계 중…</p>;
  if (!wave) return <p className="text-sm text-muted">웨이브를 찾을 수 없습니다.</p>;

  const reportConfig = wave.reportConfig ?? null;
  const isEnabled = (code: string) => sectionEnabled(code, reportConfig, wave.enabledSectionCodes);
  const showTeamsTab = !reportConfig || isTabEnabledInReport("summary", reportConfig);
  const showNarratives = reportConfig?.showNarratives !== false;

  const radarData =
    activeScores?.scores && !activeScores.hidden
      ? [
          isEnabled("OHI") && activeScores.scores.ohi.overall != null
            ? { axis: "OHI", value: activeScores.scores.ohi.overall }
            : null,
          isEnabled("ORI") && activeScores.scores.ori.ORI != null
            ? { axis: "ORI", value: activeScores.scores.ori.ORI }
            : null,
          isEnabled("OVI") && activeScores.scores.ovi.OVI != null
            ? { axis: "OVI", value: activeScores.scores.ovi.OVI }
            : null,
          isEnabled("OAI") && activeScores.scores.oai.OAI != null
            ? { axis: "OAI", value: activeScores.scores.oai.OAI }
            : null,
        ].filter((d): d is { axis: string; value: number } => d != null)
      : [];

  const driverEntries = activeScores?.scores?.ohi.drivers
    ? Object.entries(activeScores.scores.ohi.drivers).map(([code, d]) => ({
        code,
        current: d.current ?? 0,
        importance: d.importance ?? 0,
      }))
    : [];

  const hierarchyRows = aggregate?.teams ?? [];
  const nodeById = new Map(hierarchyRows.map((r) => [r.teamId, r]));
  const childrenOf = (parentId: string | null) =>
    hierarchyRows.filter((r) => (r.parentId ?? null) === parentId);
  const drillBreadcrumb: typeof hierarchyRows = [];
  {
    let cur = drillId ? nodeById.get(drillId) : undefined;
    while (cur) {
      drillBreadcrumb.unshift(cur);
      cur = cur.parentId ? nodeById.get(cur.parentId) : undefined;
    }
  }
  const drillChildren = childrenOf(drillId);
  const drillBarData = drillChildren
    .filter((t) => !t.hidden)
    .map((t) => ({
      name: t.teamName,
      OHI: t.OHI_SE ?? 0,
      ORI: t.ORI ?? 0,
      OVI: t.OVI ?? 0,
      OAI: t.OAI ?? 0,
    }));

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            Wave {wave.waveNumber}
            {wave.label ? ` · ${wave.label}` : ""}
            {wave.sectionBadge ? ` · ${wave.sectionBadge}` : ""}
            {typeof wave.responseCount === "number" ? ` · 제출 ${wave.responseCount}건` : ""}
          </p>
        </div>
        {wave.orgWideLink ? (
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-medium text-accent hover:bg-background"
            onClick={() => {
              void navigator.clipboard.writeText(wave.orgWideLink!).then(() => {
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 1600);
              });
            }}
          >
            {linkCopied ? "링크 복사됨" : "조직 전체 링크 복사"}
          </button>
        ) : null}
      </div>

      <div
        className="flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-card-border bg-card/40 p-1 [-webkit-overflow-scrolling:touch]"
        role="tablist"
        aria-label="리포트 보기"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "overview"}
          className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:px-4 ${
            tab === "overview"
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setTab("overview")}
        >
          종합
        </button>
        {showTeamsTab ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === "teams"}
            className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:px-4 ${
              tab === "teams"
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
            onClick={() => setTab("teams")}
          >
            조직별
          </button>
        ) : null}
      </div>

      {tab === "overview" && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="sr-only" htmlFor="diagnosis-scope">
              집계 범위
            </label>
            <select
              id="diagnosis-scope"
              className="min-h-11 w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-base sm:w-auto sm:min-w-[16rem] sm:text-sm"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="all">전사 종합</option>
              {wave.hierarchy && wave.hierarchy.length > 0
                ? flattenHierarchy(wave.hierarchy).map(({ node, depth }) => (
                    <option key={node.id} value={node.id}>
                      {"  ".repeat(depth)}
                      {depth > 0 ? "› " : ""}
                      {LEVEL_LABEL[node.level]} · {node.name}
                    </option>
                  ))
                : wave.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
            </select>
          </div>

          {activeScores?.hidden ? (
            <div className="rounded-2xl border border-dashed border-card-border bg-card/30 px-5 py-10 text-center">
              <p className="font-medium text-foreground">표본이 아직 부족합니다</p>
              <p className="mt-2 text-sm text-muted">
                N={activeScores.sampleSize ?? 0} · 최소 {activeScores.minGroupSize ?? 5}명 제출 후
                점수가 공개됩니다.
              </p>
            </div>
          ) : (
            <>
              <ScoreHero
                title={selectedTeam === "all" ? "전사 조직 펄스" : "선택 조직 펄스"}
                meta={
                  wave.label
                    ? `Wave ${wave.waveNumber} · ${wave.label}`
                    : `Wave ${wave.waveNumber}`
                }
                axes={[
                  ...(isEnabled("OHI")
                    ? [
                        {
                          code: "OHI",
                          value: activeScores?.scores?.ohi.overall,
                          band: activeScores?.scores?.ohi.band,
                          meaning: buildAxisMeaningLine(
                            "OHI",
                            activeScores?.scores?.ohi.overall,
                            activeScores?.scores?.ohi.band,
                          ),
                        },
                      ]
                    : []),
                  ...(isEnabled("ORI")
                    ? [
                        {
                          code: "ORI",
                          value: activeScores?.scores?.ori.ORI,
                          band: activeScores?.scores?.ori.band,
                          meaning: buildAxisMeaningLine(
                            "ORI",
                            activeScores?.scores?.ori.ORI,
                            activeScores?.scores?.ori.band,
                          ),
                        },
                      ]
                    : []),
                  ...(isEnabled("OVI")
                    ? [
                        {
                          code: "OVI",
                          value: activeScores?.scores?.ovi.OVI,
                          band: activeScores?.scores?.ovi.band,
                          meaning: buildAxisMeaningLine(
                            "OVI",
                            activeScores?.scores?.ovi.OVI,
                            activeScores?.scores?.ovi.band,
                          ),
                        },
                      ]
                    : []),
                  ...(isEnabled("OAI")
                    ? [
                        {
                          code: "OAI",
                          value: activeScores?.scores?.oai.OAI,
                          band: activeScores?.scores?.oai.band,
                          meaning: buildAxisMeaningLine(
                            "OAI",
                            activeScores?.scores?.oai.OAI,
                            activeScores?.scores?.oai.band,
                          ),
                        },
                      ]
                    : []),
                ]}
              />

              {showNarratives && executiveSummary ? (
                <ExecutiveSummaryCard parts={executiveSummary} />
              ) : null}

              <details className="rounded-2xl border border-card-border bg-card/30 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  리포트 읽는 법
                </summary>
                <div className="mt-3">
                  <ReportGuideCard />
                </div>
              </details>

              <DiagnosticLongitudinalPanel waveId={waveId} apiBase="org" />

              {radarData.length > 0 ? (
                <div className="rounded-2xl border border-card-border bg-card/40 p-4">
                  <h3 className="mb-2 text-sm font-semibold">4축 레이더</h3>
                  <ArcRadar data={radarData} />
                </div>
              ) : null}

              {driverEntries.length > 0 ? (
                <div className="rounded-2xl border border-card-border bg-card/40 p-4">
                  <h3 className="mb-2 text-sm font-semibold">드라이버 — 현재 vs 중요도</h3>
                  <div className="h-64 sm:h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={driverEntries} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 5]} tickFormatter={scoreAxisTick} />
                        <YAxis type="category" dataKey="code" width={36} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => formatScore(v)} />
                        <Bar dataKey="current" name="현재" fill="#c9a227" />
                        <Bar dataKey="importance" name="중요도" fill="#64748b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {isEnabled("OHI") && (
                  <InsightCard
                    title="Risk Index"
                    body={
                      activeScores?.scores?.ohi.riskIndex != null
                        ? `${Math.round(activeScores.scores.ohi.riskIndex * 100)}% — 번아웃·이탈 위험 신호`
                        : "—"
                    }
                  />
                )}
                {isEnabled("ORI") && (
                  <>
                    <InsightCard
                      title="Opportunity Score"
                      body={
                        activeScores?.scores?.ori.opportunity
                          ? `${activeScores.scores.ori.opportunity.band}: ${activeScores.scores.ori.opportunity.prescription}`
                          : "—"
                      }
                    />
                    <InsightCard
                      title="AX 성숙도"
                      body={
                        activeScores?.scores?.ori.axMaturity
                          ? `${activeScores.scores.ori.axMaturity.stage}단계 — ${activeScores.scores.ori.axMaturity.label}`
                          : "—"
                      }
                    />
                  </>
                )}
                {isEnabled("OAI") && (
                  <InsightCard
                    title="OAI 패턴"
                    body={
                      activeScores?.scores?.oaiPattern
                        ? `${activeScores.scores.oaiPattern.pattern}: ${activeScores.scores.oaiPattern.message}`
                        : "—"
                    }
                  />
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "teams" && (
        <div className="space-y-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain px-1 pb-1 text-sm [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              className={`min-h-10 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                drillId === null
                  ? "bg-foreground text-background"
                  : "border border-card-border text-muted"
              }`}
              onClick={() => setDrillId(null)}
            >
              전사 종합
            </button>
            {drillBreadcrumb.map((node) => (
              <span key={node.teamId} className="flex shrink-0 items-center gap-1">
                <span className="text-muted">›</span>
                <button
                  type="button"
                  className={`min-h-10 rounded-full px-3 py-1.5 text-xs font-medium ${
                    drillId === node.teamId
                      ? "bg-foreground text-background"
                      : "border border-card-border text-muted"
                  }`}
                  onClick={() => setDrillId(node.teamId)}
                >
                  {LEVEL_LABEL[node.level ?? "TEAM"]} · {node.teamName}
                </button>
              </span>
            ))}
          </div>

          {drillId &&
            (() => {
              const self = nodeById.get(drillId);
              if (!self) return null;
              if (self.hidden) {
                return (
                  <div className="rounded-2xl border border-dashed border-card-border bg-card/30 p-4 text-sm text-muted">
                    표본 부족 — 최소 5명 필요 (현재 N={self.sampleSize ?? 0})
                  </div>
                );
              }
              return (
                <div className="rounded-2xl border border-card-border bg-card/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {LEVEL_LABEL[self.level ?? "TEAM"]} · {self.teamName}
                    </span>
                    <span className="text-xs text-muted">N={self.sampleSize ?? "—"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    {isEnabled("OHI") && <MiniMetric label="OHI(SE)" value={self.OHI_SE} />}
                    {isEnabled("ORI") && <MiniMetric label="ORI" value={self.ORI} />}
                    {isEnabled("OVI") && <MiniMetric label="OVI" value={self.OVI} />}
                    {isEnabled("OAI") && <MiniMetric label="OAI" value={self.OAI} />}
                  </div>
                </div>
              );
            })()}

          {drillId === null && aggregate?.gapMatrix?.mode === "OLS_RESIDUAL" && (
            <div className="rounded-2xl border border-card-border bg-card/40 p-4">
              <h3 className="mb-1 text-sm font-semibold">팀 OLS 잔차 (ORI→OVI)</h3>
              <p className="mb-3 text-xs text-muted">{aggregate.gapMatrix.note}</p>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="ORI" name="ORI" domain={[1, 5]} />
                    <YAxis type="number" dataKey="OVI" name="OVI" domain={[1, 5]} />
                    <ZAxis range={[80, 80]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter
                      data={(aggregate.gapMatrix.teams ?? []).filter(
                        (t) => t.ORI != null && t.OVI != null,
                      )}
                    >
                      {(aggregate.gapMatrix.teams ?? []).map((t) => (
                        <Cell
                          key={t.teamId}
                          fill={t.priorityManage ? "#ef4444" : "#c9a227"}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {drillId === null && aggregate?.gapMatrix?.mode === "GAP_MATRIX" && aggregate.gapMatrix.teams && (
            <div className="rounded-2xl border border-card-border bg-card/40 p-4">
              <h3 className="mb-2 text-sm font-semibold">팀 Gap 매트릭스 (ORI vs OVI)</h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="ORI" name="ORI" domain={[1, 5]} />
                    <YAxis type="number" dataKey="OVI" name="OVI" domain={[1, 5]} />
                    <ZAxis range={[80, 80]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter data={aggregate.gapMatrix.teams.filter((t) => t.ORI != null && t.OVI != null)}>
                      {(aggregate.gapMatrix.teams ?? []).map((t) => (
                        <Cell key={t.teamId} fill="#c9a227" />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {drillBarData.length >= 2 && (
            <div className="rounded-2xl border border-card-border bg-card/40 p-4">
              <h3 className="mb-2 text-sm font-semibold">
                {LEVEL_LABEL[drillChildren[0]?.level ?? "TEAM"]} 간 비교
              </h3>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={drillBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[1, 5]} tickFormatter={scoreAxisTick} />
                    <Tooltip formatter={(v: number) => formatScore(v)} />
                    {isEnabled("OHI") && <Bar dataKey="OHI" name="OHI(SE)" fill="#c9a227" />}
                    {isEnabled("ORI") && <Bar dataKey="ORI" fill="#64748b" />}
                    {isEnabled("OVI") && <Bar dataKey="OVI" fill="#94a3b8" />}
                    {isEnabled("OAI") && <Bar dataKey="OAI" fill="#475569" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {drillChildren.length > 0 ? (
            <ul className="space-y-2">
              {drillChildren.map((t) => {
                const hasChildren = childrenOf(t.teamId).length > 0;
                return (
                  <li
                    key={t.teamId}
                    className={`rounded-2xl border border-card-border bg-card/40 text-sm ${
                      t.hidden ? "opacity-50" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center justify-between gap-2 px-4 py-3 text-left"
                      onClick={() => setDrillId(t.teamId)}
                    >
                      <span className="min-w-0 font-medium text-foreground">
                        <span className="mr-2 inline-block rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-muted dark:bg-white/10">
                          {LEVEL_LABEL[t.level ?? "TEAM"]}
                        </span>
                        {t.teamName}
                        {hasChildren ? <span className="ml-1 text-muted">›</span> : null}
                      </span>
                      {t.hidden ? (
                        <span className="shrink-0 text-xs text-muted">표본 부족</span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">
                          N={t.sampleSize ?? "—"}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            drillId && <p className="text-sm text-muted">하위 조직이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-xl border border-card-border bg-background/60 px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-0.5 font-[family-name:var(--font-outfit)] text-lg font-bold tabular-nums text-foreground">
        {formatScore(value)}
      </p>
    </div>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card/40 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DiagnosticLongitudinalPanel } from "@/components/diagnostic/DiagnosticLongitudinalPanel";
import type { ResolvedReportConfig, ReportTab } from "@/lib/diagnostic/report-profile";
import { isSectionEnabledInReport, isTabEnabledInReport } from "@/lib/diagnostic/report-profile";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
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
  Legend,
} from "recharts";

type Tab = ReportTab;

const LEVEL_LABEL: Record<"DIVISION" | "UNIT" | "TEAM", string> = {
  DIVISION: "사업본부",
  UNIT: "사업부",
  TEAM: "팀",
};

const DRIVER_LABELS: Record<string, string> = {
  D: "전략방향",
  SL: "경영진리더십",
  SV: "직속상사",
  PS: "심리적안전",
  EM: "구조·자율권",
  PM: "성과·보상",
  LG: "학습·성장",
  CI: "문화·포용",
  WE: "업무환경",
  C: "소통·정보",
};

type DriverImportanceEntry = {
  code: string;
  current: number | null;
  beta: number | null;
  priority: "FOCUS" | "MAINTAIN" | null;
};

type DriverImportanceSummary = {
  entries: DriverImportanceEntry[];
  rSquared: number | null;
  n: number;
  insufficientData: boolean;
};

type TeamReliability = {
  icc: number | null;
  n: number;
  k: number;
  interpretation: string | null;
};

type Scores = {
  hidden: boolean;
  reason?: string;
  sampleSize?: number;
  minGroupSize?: number;
  driverImportance?: DriverImportanceSummary;
  teamReliability?: TeamReliability;
  scores?: {
    ohi: {
      overall: number | null;
      band: string | null;
      riskIndex: number | null;
      drivers: Record<string, { current: number | null; importance: number | null }>;
    };
    ori: {
      ORI: number | null;
      band: string | null;
      opportunity: { band: string; prescription: string } | null;
      axMaturity: { stage: number; label: string } | null;
    };
    ovi: {
      OVI: number | null;
      band: string | null;
      dynamicCongruenceGap: number | null;
    };
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
    }>;
  };
};

type WaveMeta = {
  id: string;
  label: string | null;
  waveNumber: number;
  responseCount: number;
  memberCount: number | null;
  enabledSectionCodes: string[] | null;
  sectionBadge: string;
  reportConfig: ResolvedReportConfig | null;
  teams: Array<{ id: string; name: string }>;
};

function sectionEnabled(code: string, config: ResolvedReportConfig | null, fallback: string[] | null) {
  if (config) return isSectionEnabledInReport(code, config);
  if (!fallback?.length) return true;
  return fallback.includes(code);
}

function driverInsights(drivers: Record<string, { current: number | null; importance: number | null }>) {
  const entries = Object.entries(drivers)
    .filter(([, d]) => d.current != null)
    .map(([code, d]) => ({
      code,
      current: d.current as number,
      gap: d.importance != null && d.current != null ? d.importance - d.current : 0,
    }));
  const strengths = [...entries].sort((a, b) => b.current - a.current).slice(0, 2);
  const improvements = [...entries].sort((a, b) => b.gap - a.gap).slice(0, 2);
  return { strengths, improvements };
}

function StatsEnginePlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card-luxe border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          통계분석 엔진 연결 예정
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">
        {description ?? "다음 배치에서 Python 통계 서비스와 연동됩니다. 추정치를 표시하지 않습니다."}
      </p>
    </div>
  );
}

function SampleInsufficient({ sampleSize, minGroupSize }: { sampleSize?: number; minGroupSize?: number }) {
  return (
    <div className="card-luxe p-6 text-center text-sm text-muted">
      표본 부족 — 최소 {minGroupSize ?? 5}명 필요 (현재 N={sampleSize ?? 0})
    </div>
  );
}

export function AdminDiagnosticReport({ waveId }: { waveId: string }) {
  const [tab, setTab] = useState<Tab>("basic");
  const [wave, setWave] = useState<WaveMeta | null>(null);
  const [aggregate, setAggregate] = useState<Scores | null>(null);
  const [teamScores, setTeamScores] = useState<Record<string, Scores>>({});
  const [detailSection, setDetailSection] = useState<string>("OHI");
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [waveRes, scoreRes] = await Promise.all([
      fetch(`/api/admin/diagnostic/waves/${waveId}`),
      fetch(`/api/admin/diagnostic/waves/${waveId}/scores`),
    ]);
    const waveJson = await waveRes.json();
    const scoreJson = await scoreRes.json();
    if (waveRes.ok) {
      const w = waveJson.wave;
      setWave({
        id: w.id,
        label: w.label,
        waveNumber: w.waveNumber,
        responseCount: w.responseCount,
        memberCount: w.memberCount ?? null,
        enabledSectionCodes: w.enabledSectionCodes,
        sectionBadge: w.sectionBadge,
        reportConfig: w.reportConfig ?? null,
        teams: w.teams.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })),
      });
      const config = w.reportConfig as ResolvedReportConfig | null;
      const enabled = config?.activeSectionCodes ?? (w.enabledSectionCodes as string[] | null);
      const first =
        ["OHI", "ORI", "OVI", "OAI"].find((c) => sectionEnabled(c, config, enabled)) ?? "OHI";
      setDetailSection(first);
      const tabs = config?.activeTabs ?? ["basic", "detail", "teams"];
      if (tabs.length && !tabs.includes(tab)) setTab(tabs[0] as Tab);
    }
    setAggregate(scoreJson);
    setLoading(false);
  }, [waveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadTeamScore = async (teamId: string) => {
    if (teamScores[teamId]) return;
    const res = await fetch(`/api/admin/diagnostic/waves/${waveId}/scores?teamId=${teamId}`);
    const json = await res.json();
    setTeamScores((prev) => ({ ...prev, [teamId]: json }));
  };

  useEffect(() => {
    if (tab !== "teams") return;
    if (!selectedNodeId) return;
    const row = aggregate?.teams?.find((r) => r.teamId === selectedNodeId);
    if (row && !row.hidden) void loadTeamScore(selectedNodeId);
  }, [tab, selectedNodeId, aggregate?.teams, teamScores, waveId]);

  const reportConfig = wave?.reportConfig ?? null;
  const enabled = reportConfig?.activeSectionCodes ?? wave?.enabledSectionCodes ?? null;
  const isEnabled = (code: string) => sectionEnabled(code, reportConfig, enabled);
  const visibleTabs = (
    [
      ["basic", "기본"],
      ["detail", "상세"],
      ["teams", "팀별"],
    ] as const
  ).filter(([key]) => !reportConfig || isTabEnabledInReport(key, reportConfig));
  const collectionRate =
    wave?.memberCount && wave.memberCount > 0
      ? Math.round((wave.responseCount / wave.memberCount) * 100)
      : null;

  const radarData = useMemo(() => {
    if (!aggregate?.scores || aggregate.hidden) return [];
    const s = aggregate.scores;
    const axes: { axis: string; value: number }[] = [];
    if (isEnabled("OHI") && s.ohi.overall != null)
      axes.push({ axis: "OHI", value: s.ohi.overall });
    if (isEnabled("ORI") && s.ori.ORI != null)
      axes.push({ axis: "ORI", value: s.ori.ORI });
    if (isEnabled("OVI") && s.ovi.OVI != null)
      axes.push({ axis: "OVI", value: s.ovi.OVI });
    if (isEnabled("OAI") && s.oai.OAI != null)
      axes.push({ axis: "OAI", value: s.oai.OAI });
    return axes;
  }, [aggregate, enabled]);

  const driverEntries =
    aggregate?.scores && !aggregate.hidden && isEnabled("OHI")
      ? Object.entries(aggregate.scores.ohi.drivers).map(([code, d]) => ({
          code,
          current: d.current ?? 0,
          importance: d.importance ?? 0,
        }))
      : [];

  const insights =
    aggregate?.scores && !aggregate.hidden && isEnabled("OHI")
      ? driverInsights(aggregate.scores.ohi.drivers)
      : null;

  const hierarchyRows = aggregate?.teams ?? [];
  const nodeById = new Map(hierarchyRows.map((r) => [r.teamId, r]));
  const childrenOf = (parentId: string | null) =>
    hierarchyRows.filter((r) => (r.parentId ?? null) === parentId);
  const breadcrumb: typeof hierarchyRows = [];
  {
    let cur = selectedNodeId ? nodeById.get(selectedNodeId) : undefined;
    while (cur) {
      breadcrumb.unshift(cur);
      cur = cur.parentId ? nodeById.get(cur.parentId) : undefined;
    }
  }
  const currentChildren = childrenOf(selectedNodeId);
  const visibleChildren = currentChildren.filter((t) => !t.hidden);
  const childBarData = visibleChildren.map((t) => ({
    name: t.teamName,
    OHI: t.OHI_SE ?? 0,
    ORI: t.ORI ?? 0,
    OVI: t.OVI ?? 0,
    OAI: t.OAI ?? 0,
  }));
  const selectedDetail = selectedNodeId ? teamScores[selectedNodeId] : null;

  if (loading) return <p className="text-sm text-muted">집계 중…</p>;
  if (!wave) return <p className="text-sm text-muted">캠페인을 찾을 수 없습니다.</p>;

  const detailSections = ["OHI", "ORI", "OVI", "OAI"].filter((c) => isEnabled(c));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/admin/diagnostic/waves/${waveId}`} className="text-accent hover:underline">
          ← 캠페인 상세
        </Link>
      </div>

      <div className="card-luxe p-4">
        <h1 className="text-xl font-bold text-foreground">
          보고서 — Wave {wave.waveNumber}
          {wave.label ? ` · ${wave.label}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">
          활성 섹션: {wave.sectionBadge} · 응답 {wave.responseCount}건
          {collectionRate != null ? ` · 수집률 약 ${collectionRate}%` : ""}
        </p>
      </div>

      <DiagnosticLongitudinalPanel waveId={waveId} apiBase="admin" />

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`nav-pill ${tab === key ? "nav-pill-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <>
          {aggregate?.hidden ? (
            <SampleInsufficient sampleSize={aggregate.sampleSize} minGroupSize={aggregate.minGroupSize} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isEnabled("OHI") && (
                  <MetricCard label="OHI" value={aggregate?.scores?.ohi.overall} band={aggregate?.scores?.ohi.band} />
                )}
                {isEnabled("ORI") && (
                  <MetricCard label="ORI" value={aggregate?.scores?.ori.ORI} band={aggregate?.scores?.ori.band} />
                )}
                {isEnabled("OVI") && (
                  <MetricCard label="OVI" value={aggregate?.scores?.ovi.OVI} band={aggregate?.scores?.ovi.band} />
                )}
                {isEnabled("OAI") && (
                  <MetricCard label="OAI" value={aggregate?.scores?.oai.OAI} band={aggregate?.scores?.oai.band} />
                )}
              </div>

              {radarData.length >= 2 && (
                <div className="card-luxe p-4">
                  <h3 className="mb-2 text-sm font-semibold">활성 축 레이더</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
                        <Radar dataKey="value" stroke="#c9a227" fill="#c9a227" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {isEnabled("OHI") && (
                  <InsightCard
                    title="Risk Index"
                    body={
                      aggregate?.scores?.ohi.riskIndex != null
                        ? `${Math.round(aggregate.scores.ohi.riskIndex * 100)}% — 번아웃·이탈 위험 신호`
                        : "—"
                    }
                  />
                )}
                {isEnabled("ORI") && (
                  <InsightCard
                    title="Opportunity Score"
                    body={
                      aggregate?.scores?.ori.opportunity
                        ? `${aggregate.scores.ori.opportunity.band}: ${aggregate.scores.ori.opportunity.prescription}`
                        : "—"
                    }
                  />
                )}
              </div>

              {insights && (insights.strengths.length > 0 || insights.improvements.length > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                  <InsightCard
                    title="강점 요약"
                    body={
                      insights.strengths.length > 0
                        ? insights.strengths.map((s) => `${s.code} (${s.current.toFixed(2)})`).join(", ")
                        : "—"
                    }
                  />
                  <InsightCard
                    title="개선 요약"
                    body={
                      insights.improvements.length > 0
                        ? insights.improvements.map((s) => `${s.code} (격차 ${s.gap.toFixed(2)})`).join(", ")
                        : "—"
                    }
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "detail" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {detailSections.map((code) => (
              <button
                key={code}
                type="button"
                className={`nav-pill text-xs ${detailSection === code ? "nav-pill-active" : ""}`}
                onClick={() => setDetailSection(code)}
              >
                {code}
              </button>
            ))}
          </div>

          {aggregate?.hidden ? (
            <SampleInsufficient sampleSize={aggregate.sampleSize} minGroupSize={aggregate.minGroupSize} />
          ) : (
            <>
              {detailSection === "OHI" && isEnabled("OHI") && (
                <>
                  {driverEntries.length > 0 ? (
                    <div className="card-luxe p-4">
                      <h3 className="mb-2 text-sm font-semibold">10개 드라이버 — 현재 vs 중요도</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={driverEntries} layout="vertical" margin={{ left: 24 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 5]} />
                            <YAxis type="category" dataKey="code" width={40} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="current" name="현재" fill="#c9a227" />
                            <Bar dataKey="importance" name="중요도" fill="#64748b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <SampleInsufficient sampleSize={aggregate?.sampleSize} minGroupSize={aggregate?.minGroupSize} />
                  )}
                  <DriverPriorityChart summary={aggregate?.driverImportance} />
                </>
              )}

              {detailSection === "ORI" && isEnabled("ORI") && (
                <div className="grid gap-4 md:grid-cols-2">
                  <InsightCard
                    title="AX 성숙도 5단계"
                    body={
                      aggregate?.scores?.ori.axMaturity
                        ? `${aggregate.scores.ori.axMaturity.stage}단계 — ${aggregate.scores.ori.axMaturity.label}`
                        : "판정 불가 (데이터 부족)"
                    }
                  />
                  <InsightCard
                    title="Opportunity Score"
                    body={
                      aggregate?.scores?.ori.opportunity
                        ? `${aggregate.scores.ori.opportunity.band}: ${aggregate.scores.ori.opportunity.prescription}`
                        : "—"
                    }
                  />
                </div>
              )}

              {detailSection === "OVI" && isEnabled("OVI") && (
                <InsightCard
                  title="Dynamic Congruence Gap"
                  body={
                    aggregate?.scores?.ovi.dynamicCongruenceGap != null
                      ? `격차 ${aggregate.scores.ovi.dynamicCongruenceGap.toFixed(2)} (AV−HV)`
                      : "—"
                  }
                />
              )}

              {detailSection === "OAI" && isEnabled("OAI") && (
                <InsightCard
                  title="OAI 패턴"
                  body={
                    aggregate?.scores?.oaiPattern
                      ? `${aggregate.scores.oaiPattern.pattern}: ${aggregate.scores.oaiPattern.message}`
                      : "—"
                  }
                />
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <StatsEnginePlaceholder
                  title="LPA 구성원 유형"
                  description="잠재프로파일분석(GMM 기반)은 파이썬 통계 서비스 연결 후 활성화됩니다."
                />
                <IccCard reliability={aggregate?.teamReliability} />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "teams" && (
        <div className="space-y-4">
          {hierarchyRows.length === 0 ? (
            <div className="card-luxe space-y-3 p-6 text-center">
              <p className="text-sm text-muted">
                팀별 링크를 발급하면 팀별 리포트가 활성화됩니다.
              </p>
              <Link
                href={`/admin/diagnostic/waves/${waveId}#team-links`}
                className="btn-primary inline-flex px-4 py-2 text-sm"
              >
                팀별 링크 추가로 이동
              </Link>
            </div>
          ) : (
            <>
              {/* 전사 → 사업본부 → 사업부 → 팀 브레드크럼 */}
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <button
                  type="button"
                  className={`nav-pill text-xs ${selectedNodeId === null ? "nav-pill-active" : ""}`}
                  onClick={() => setSelectedNodeId(null)}
                >
                  전사 종합
                </button>
                {breadcrumb.map((node) => (
                  <span key={node.teamId} className="flex items-center gap-1">
                    <span className="text-muted">›</span>
                    <button
                      type="button"
                      className={`nav-pill text-xs ${selectedNodeId === node.teamId ? "nav-pill-active" : ""}`}
                      onClick={() => setSelectedNodeId(node.teamId)}
                    >
                      {LEVEL_LABEL[node.level ?? "TEAM"]} · {node.teamName}
                    </button>
                  </span>
                ))}
              </div>

              {/* 현재 선택된 노드 자체의 숫자 — 하이어라키 행에 이미 있는 값이라 즉시 표시 가능 */}
              {selectedNodeId &&
                (() => {
                  const self = nodeById.get(selectedNodeId);
                  if (!self) return null;
                  if (self.hidden) {
                    return (
                      <div className="card-luxe p-4 text-sm text-muted">
                        표본 부족 — 최소 5명 필요 (현재 N={self.sampleSize ?? 0})
                      </div>
                    );
                  }
                  const selfInsights =
                    selectedDetail?.scores && !selectedDetail.hidden && isEnabled("OHI")
                      ? driverInsights(selectedDetail.scores.ohi.drivers)
                      : null;
                  return (
                    <div className="card-luxe space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {LEVEL_LABEL[self.level ?? "TEAM"]} · {self.teamName}
                        </span>
                        <span className="text-xs text-muted">N={self.sampleSize ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {isEnabled("OHI") && <MetricCard label="OHI(SE)" value={self.OHI_SE} band={null} />}
                        {isEnabled("ORI") && <MetricCard label="ORI" value={self.ORI} band={null} />}
                        {isEnabled("OVI") && <MetricCard label="OVI" value={self.OVI} band={null} />}
                        {isEnabled("OAI") && <MetricCard label="OAI" value={self.OAI} band={null} />}
                      </div>
                      {selfInsights && (selfInsights.strengths.length > 0 || selfInsights.improvements.length > 0) && (
                        <div className="grid gap-2 text-xs sm:grid-cols-2">
                          <p className="text-muted">
                            <span className="font-medium text-foreground">강점: </span>
                            {selfInsights.strengths.map((s) => s.code).join(", ") || "—"}
                          </p>
                          <p className="text-muted">
                            <span className="font-medium text-foreground">개선: </span>
                            {selfInsights.improvements.map((s) => s.code).join(", ") || "—"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

              {selectedNodeId === null && aggregate?.gapMatrix?.mode === "OLS_REQUIRED" && (
                <div className="card-luxe p-4 text-sm text-muted">
                  <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50">
                    OLS 회귀분석 엔진 연결 예정
                  </span>
                  {aggregate.gapMatrix.note}
                </div>
              )}

              {selectedNodeId === null &&
                aggregate?.gapMatrix?.mode === "GAP_MATRIX" &&
                aggregate.gapMatrix.teams && (
                  <div className="card-luxe p-4">
                    <h3 className="mb-2 text-sm font-semibold">팀 Gap 매트릭스 (ORI vs OVI) — 리프(팀) 전체</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid />
                          <XAxis type="number" dataKey="ORI" name="ORI" domain={[1, 5]} />
                          <YAxis type="number" dataKey="OVI" name="OVI" domain={[1, 5]} />
                          <ZAxis range={[80, 80]} />
                          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                          <Scatter
                            data={aggregate.gapMatrix.teams.filter((t) => t.ORI != null && t.OVI != null)}
                          >
                            {(aggregate.gapMatrix.teams ?? []).map((t) => (
                              <Cell key={t.teamId} fill="#c9a227" />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

              {childBarData.length >= 2 && (
                <div className="card-luxe p-4">
                  <h3 className="mb-2 text-sm font-semibold">
                    {LEVEL_LABEL[currentChildren[0]?.level ?? "TEAM"]} 간 비교
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={childBarData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[1, 5]} />
                        <Tooltip />
                        <Legend />
                        {isEnabled("OHI") && <Bar dataKey="OHI" name="OHI(SE)" fill="#c9a227" />}
                        {isEnabled("ORI") && <Bar dataKey="ORI" fill="#64748b" />}
                        {isEnabled("OVI") && <Bar dataKey="OVI" fill="#94a3b8" />}
                        {isEnabled("OAI") && <Bar dataKey="OAI" fill="#475569" />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {currentChildren.length > 0 ? (
                <ul className="space-y-3">
                  {currentChildren.map((t) => {
                    const hasChildren = childrenOf(t.teamId).length > 0;
                    return (
                      <li key={t.teamId} className={`card-luxe p-4 ${t.hidden ? "opacity-50" : ""}`}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left"
                          onClick={() => setSelectedNodeId(t.teamId)}
                        >
                          <span className="font-medium text-foreground">
                            <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] text-muted dark:bg-white/10">
                              {LEVEL_LABEL[t.level ?? "TEAM"]}
                            </span>
                            {t.teamName}
                            {hasChildren && <span className="ml-1 text-muted">›</span>}
                          </span>
                          {t.hidden ? (
                            <span className="text-xs text-muted">표본 부족 — 최소 5명 필요</span>
                          ) : (
                            <span className="text-xs text-muted">
                              N={t.sampleSize ?? "—"} · OHI(SE) {t.OHI_SE?.toFixed(2) ?? "—"} · ORI{" "}
                              {t.ORI?.toFixed(2) ?? "—"} · OVI {t.OVI?.toFixed(2) ?? "—"} · OAI{" "}
                              {t.OAI?.toFixed(2) ?? "—"}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                selectedNodeId && <p className="text-sm text-muted">하위 조직이 없습니다.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  band,
}: {
  label: string;
  value: number | null | undefined;
  band: string | null | undefined;
}) {
  return (
    <div className="card-luxe p-4 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold text-foreground">
        {value != null ? value.toFixed(2) : "—"}
      </p>
      {band && <p className="mt-1 text-xs text-gold">{band}</p>}
    </div>
  );
}

function InsightCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}

function DriverPriorityChart({ summary }: { summary?: DriverImportanceSummary }) {
  if (!summary) return null;

  if (summary.insufficientData) {
    return (
      <div className="card-luxe border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">IPA (β회귀 기반 우선순위)</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            표본 부족
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          예측변수(9개 드라이버) 대비 완전응답 표본이 부족해(N={summary.n}) 회귀 추정을 생략합니다. 최소{" "}
          {summary.entries.length * 3}명 이상 완전응답 필요.
        </p>
      </div>
    );
  }

  const sorted = [...summary.entries]
    .filter((e) => e.beta != null)
    .sort((a, b) => (b.beta ?? 0) - (a.beta ?? 0));
  const focus = sorted.filter((e) => e.priority === "FOCUS");
  const maintain = sorted.filter((e) => e.priority === "MAINTAIN");

  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold text-foreground">IPA — β회귀 기반 투자 우선순위</h3>
      <p className="mt-1 text-xs text-muted">
        Y축 = 응답자 단위 다중회귀 표준화 β(SE에 대한 실제 영향력) — 자기보고 중요도가 아님. R²=
        {summary.rSquared != null ? summary.rSquared.toFixed(2) : "—"} · N={summary.n}
      </p>
      <div className="mt-3 space-y-1.5">
        {sorted.map((e) => (
          <div key={e.code} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 text-muted">{DRIVER_LABELS[e.code] ?? e.code}</span>
            <div className="h-2 flex-1 rounded-full bg-black/5 dark:bg-white/10">
              <div
                className={`h-2 rounded-full ${e.priority === "FOCUS" ? "bg-red-500" : "bg-slate-400"}`}
                style={{ width: `${Math.min(100, Math.max(2, ((e.beta ?? 0) / (sorted[0]?.beta || 1)) * 100))}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-medium text-foreground">{e.beta?.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {focus.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          <span className="font-medium text-foreground">집중 개선(영향력 높음·현재수준 낮음): </span>
          {focus.map((e) => DRIVER_LABELS[e.code] ?? e.code).join(", ")}
        </p>
      )}
      {maintain.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          <span className="font-medium text-foreground">현상 유지: </span>
          {maintain.map((e) => DRIVER_LABELS[e.code] ?? e.code).join(", ")}
        </p>
      )}
    </div>
  );
}

function IccCard({ reliability }: { reliability?: TeamReliability }) {
  if (!reliability || reliability.icc == null) {
    return (
      <div className="card-luxe border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">ICC (팀간 신뢰도)</h3>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
            계산 불가
          </span>
        </div>
        <p className="mt-2 text-xs text-muted">
          유효 표본을 가진 팀이 2개 미만이라 팀간 분산을 추정할 수 없습니다. HLM 전체 모형(팀 수준 예측변수 포함)은
          파이썬 통계 서비스 대상입니다.
        </p>
      </div>
    );
  }
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold text-foreground">ICC(1) — 팀간 신뢰도</h3>
      <p className="mt-2 text-2xl font-bold text-foreground">{reliability.icc.toFixed(2)}</p>
      <p className="mt-1 text-xs text-muted">
        일원배치 분산분석(ANOVA) 기반 · 팀 {reliability.k}개 · N={reliability.n}
      </p>
      {reliability.interpretation && <p className="mt-2 text-xs text-muted">{reliability.interpretation}</p>}
      <p className="mt-2 text-[11px] text-muted/70">
        완전한 HLM(팀 수준 예측변수 포함 다층모형)은 별도 파이썬 통계 서비스 대상입니다 — 여기서는 팀 간 분산 비중만
        확인합니다.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DiagnosticLongitudinalPanel } from "@/components/diagnostic/DiagnosticLongitudinalPanel";
import {
  FindingCard,
  PrescriptionCard,
  QuadrantLegend,
  QUADRANT_FILL,
  ReportSection,
  ScoreHero,
  WaveGoalCard,
} from "@/components/admin/diagnostic/ArcReportUi";
import {
  OaiReportSection,
  OriReportSection,
  OviReportSection,
} from "@/components/admin/diagnostic/ArcAxisSections";
import { AnalysisTable, PrescriptionTable } from "@/components/admin/diagnostic/ArcAnalysisUi";
import { OhiReportSection } from "@/components/admin/diagnostic/OhiReportSection";
import { OrgReportSection } from "@/components/admin/diagnostic/OrgReportSection";
import { buildFourAxisRows, scoreStatus } from "@/lib/diagnostic/analysis-tables";
import { PrintButton } from "@/components/ui/PrintButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResolvedReportConfig, ReportTab } from "@/lib/diagnostic/report-profile";
import {
  isSectionEnabledInReport,
  isTabEnabledInReport,
  REPORT_TAB_LABELS,
} from "@/lib/diagnostic/report-profile";
import { buildPrescriptions, type PrescriptionItem } from "@/lib/diagnostic/prescription";
import {
  buildExecutiveSummaryParts,
  buildKeyFindings,
  buildWaveGoals,
  DRIVER_LABELS,
  highRiskSegmentPercent,
  quadrantLabel,
} from "@/lib/diagnostic/report-narratives";
import {
  buildAxisMeaningLine,
  buildOriOviQuadrantGuide,
  RADAR_AXIS_CAPTION,
  type AxisCode,
} from "@/lib/diagnostic/report-guide";
import {
  AxisDefinitionsHint,
  ExecutiveSummaryCard,
  OriOviQuadrantLegend,
  ReportGuideCard,
} from "@/components/admin/diagnostic/ReportGuideUi";
import type { OpenTextThemeReport } from "@/lib/diagnostic/theme-mining";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ArcRadar } from "@/components/admin/diagnostic/ArcRadar";
import { ARC_SCALE_MAX, formatScore, scoreAxisTick } from "@/lib/diagnostic/format-score";
import {
  computeCollectionRatePercent,
  formatCollectionRateMeta,
} from "@/lib/diagnostic/collection-rate";
import { buildIccInterpretation } from "@/lib/diagnostic/axis-report";

const LPA_COLOR: Record<string, string> = {
  "고몰입형": "bg-emerald-500",
  "헌신·몰두형": "bg-gold",
  "번아웃위험형": "bg-red-500",
  "이탈예고형": "bg-amber-500",
};

type DriverImportanceSummary = {
  entries: Array<{
    code: string;
    current: number | null;
    beta: number | null;
    priority: "FOCUS" | "MAINTAIN" | null;
  }>;
  rSquared: number | null;
  n: number;
  insufficientData: boolean;
};

type Scores = {
  hidden: boolean;
  reason?: string;
  sampleSize?: number;
  minGroupSize?: number;
  driverImportance?: DriverImportanceSummary;
  teamLevelDriverImportance?: DriverImportanceSummary;
  teamReliability?: {
    icc: number | null;
    n: number;
    k: number;
    interpretation: string | null;
  };
  lpa?: {
    k: number;
    n: number;
    profiles: Array<{
      key: string;
      label: string;
      size: number;
      proportion: number;
      centroid: { SE: number; BO: number; TL: number };
    }>;
    insufficientData: boolean;
  };
  perRespondent?: Array<{
    ori: { ORI: number | null };
    ovi: { OVI: number | null; AV: number | null; HV: number | null; CV: number | null };
  }>;
  itemAverages?: Record<string, number | null>;
  scores?: {
    ohi: {
      overall: number | null;
      SE: number | null;
      E: number | null;
      C: number | null;
      F: number | null;
      BO: number | null;
      TL: number | null;
      TL_trust: number | null;
      TL_growth: number | null;
      TL_safety: number | null;
      band: string | null;
      riskIndex: number | null;
      quietCrackingIndex?: number | null;
      drivers: Record<string, { current: number | null; importance: number | null }>;
    };
    ori: {
      ORI: number | null;
      CD: number | null;
      LA: number | null;
      AXS: number | null;
      AXC: number | null;
      band: string | null;
      opportunity: {
        band: string;
        prescription: string;
        AXA: number | null;
        AXG: number | null;
        oppScore: number | null;
      } | null;
      axMaturity: { stage: number; label: string } | null;
    };
    ovi: {
      OVI: number | null;
      HV: number | null;
      CV: number | null;
      AV: number | null;
      band: string | null;
      dynamicCongruenceGap: number | null;
    };
    oai: {
      OAI: number | null;
      SA: number | null;
      EA: number | null;
      OA: number | null;
      band: string | null;
    };
    oaiPattern: { pattern: string; message: string } | null;
  };
  teams?: Array<{
    teamId: string;
    teamName: string;
    level?: "DIVISION" | "UNIT" | "TEAM";
    parentId?: string | null;
    sampleSize?: number;
    hidden: boolean;
    OHI?: number | null;
    ORI?: number | null;
    OVI?: number | null;
    OHI_SE?: number | null;
    riskIndex?: number | null;
    OAI?: number | null;
    drivers?: Record<string, number | null> | null;
  }>;
  gapMatrix?: {
    mode: string;
    note?: string;
    xBase?: number | null;
    yBase?: number | null;
    intercept?: number;
    slope?: number;
    rSquared?: number | null;
    n?: number;
    teams?: Array<{
      teamId: string;
      teamName: string;
      ORI: number | null;
      OVI: number | null;
      OHI_SE?: number | null;
      OAI?: number | null;
      quadrant: string | null;
      residual?: number | null;
      residualSquared?: number | null;
      typology?: string | null;
      priorityManage?: boolean;
      fastErrorWarning?: boolean;
    }>;
  };
};

type WaveMeta = {
  id: string;
  label: string | null;
  waveNumber: number;
  responseCount: number;
  inviteLinkCount: number | null;
  enabledSectionCodes: string[] | null;
  sectionBadge: string;
  reportConfig: ResolvedReportConfig | null;
  organizationId?: string | null;
  organizationName?: string | null;
};

function sectionEnabled(code: string, config: ResolvedReportConfig | null, fallback: string[] | null) {
  if (config) return isSectionEnabledInReport(code, config);
  if (!fallback?.length) return true;
  return fallback.includes(code);
}

function tabNeedsSection(tab: ReportTab): string | null {
  if (tab === "ohi") return "OHI";
  if (tab === "ori") return "ORI";
  if (tab === "ovi") return "OVI";
  if (tab === "oai") return "OAI";
  return null;
}

function formatReportDate(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function SampleInsufficient({ sampleSize, minGroupSize }: { sampleSize?: number; minGroupSize?: number }) {
  return (
    <div className="card-luxe p-6 text-center text-sm text-muted">
      표본 부족 — 최소 {minGroupSize ?? 5}명 필요 (현재 N={sampleSize ?? 0})
    </div>
  );
}

export function AdminDiagnosticReport({ waveId }: { waveId: string }) {
  const [tab, setTab] = useState<ReportTab>("summary");
  const [wave, setWave] = useState<WaveMeta | null>(null);
  const [aggregate, setAggregate] = useState<Scores | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [openTextThemes, setOpenTextThemes] = useState<OpenTextThemeReport | null>(null);
  const [openTextLoading, setOpenTextLoading] = useState(false);

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
        inviteLinkCount: w.inviteLinkCount ?? null,
        enabledSectionCodes: w.enabledSectionCodes,
        sectionBadge: w.sectionBadge,
        reportConfig: w.reportConfig ?? null,
        organizationId: w.organization?.id ?? w.organizationId ?? null,
        organizationName: w.organization?.name ?? null,
      });
      const config = w.reportConfig as ResolvedReportConfig | null;
      const tabs = config?.activeTabs ?? ["summary", "ohi", "ori", "ovi", "oai", "orgs", "prescription"];
      if (tabs.length && !tabs.includes(tab)) setTab(tabs[0] as ReportTab);
    }
    setAggregate(scoreJson);
    setLoading(false);
  }, [waveId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadOpenTextThemes = useCallback(async () => {
    if (openTextThemes || openTextLoading) return;
    setOpenTextLoading(true);
    try {
      const res = await fetch(`/api/admin/diagnostic/waves/${waveId}/open-text-themes`);
      const json = await res.json();
      setOpenTextThemes(json);
    } finally {
      setOpenTextLoading(false);
    }
  }, [waveId, openTextThemes, openTextLoading]);

  useEffect(() => {
    if (tab === "ohi" || tab === "summary" || tab === "ori" || tab === "ovi" || tab === "oai") {
      void loadOpenTextThemes();
    }
  }, [tab, loadOpenTextThemes]);

  const reportConfig = wave?.reportConfig ?? null;
  const enabled = reportConfig?.activeSectionCodes ?? wave?.enabledSectionCodes ?? null;
  const isEnabled = (code: string) => sectionEnabled(code, reportConfig, enabled);

  const visibleTabs = (Object.keys(REPORT_TAB_LABELS) as ReportTab[]).filter((key) => {
    if (reportConfig && !isTabEnabledInReport(key, reportConfig)) return false;
    const sec = tabNeedsSection(key);
    if (sec && !isEnabled(sec)) return false;
    return true;
  });

  const collectionRate = wave
    ? computeCollectionRatePercent(wave.responseCount, wave.inviteLinkCount ?? 0)
    : null;
  const collectionRateMeta = wave
    ? formatCollectionRateMeta(wave.responseCount, wave.inviteLinkCount, collectionRate)
    : null;

  const prescriptions: PrescriptionItem[] = useMemo(() => {
    if (!aggregate || aggregate.hidden) return [];
    return buildPrescriptions({
      driverImportance: aggregate.driverImportance,
      teamLevelDriverImportance: aggregate.teamLevelDriverImportance,
      opportunity: aggregate.scores?.ori.opportunity ?? null,
      oaiPattern: aggregate.scores?.oaiPattern ?? null,
      teamReliability: aggregate.teamReliability ?? null,
      lpa: aggregate.lpa,
    });
  }, [aggregate]);

  const executiveSummary = useMemo(() => {
    if (!aggregate?.scores || aggregate.hidden || !wave) return null;
    const enabledAxes = (["OHI", "ORI", "OVI", "OAI"] as AxisCode[]).filter((c) => isEnabled(c));
    return buildExecutiveSummaryParts({
      scores: aggregate.scores,
      sampleSize: aggregate.sampleSize ?? 0,
      collectionRate,
      inviteLinkCount: wave.inviteLinkCount,
      waveLabel: wave.label,
      waveNumber: wave.waveNumber,
      enabledAxes,
    });
  }, [aggregate, wave, collectionRate, reportConfig, enabled]);

  const keyFindings = useMemo(() => {
    if (!aggregate?.scores || aggregate.hidden) return [];
    return buildKeyFindings({
      scores: aggregate.scores,
      driverImportance: aggregate.driverImportance,
      lpa: aggregate.lpa,
      gapMatrix: aggregate.gapMatrix,
    });
  }, [aggregate]);

  const waveGoals = useMemo(() => {
    if (!aggregate?.scores || aggregate.hidden) return [];
    return buildWaveGoals({ scores: aggregate.scores, prescriptions });
  }, [aggregate, prescriptions]);

  const riskyPct = highRiskSegmentPercent(aggregate?.lpa);

  const radarData = useMemo(() => {
    if (!aggregate?.scores || aggregate.hidden) return [];
    const s = aggregate.scores;
    const axes: { axis: string; value: number }[] = [];
    if (isEnabled("OHI") && s.ohi.overall != null) axes.push({ axis: "OHI", value: s.ohi.overall });
    if (isEnabled("ORI") && s.ori.ORI != null) axes.push({ axis: "ORI", value: s.ori.ORI });
    if (isEnabled("OVI") && s.ovi.OVI != null) axes.push({ axis: "OVI", value: s.ovi.OVI });
    if (isEnabled("OAI") && s.oai.OAI != null) axes.push({ axis: "OAI", value: s.oai.OAI });
    return axes;
  }, [aggregate, enabled]);

  const velocityScatter = useMemo(() => {
    if (!aggregate?.perRespondent) return [];
    return aggregate.perRespondent
      .filter((r) => r.ori.ORI != null && r.ovi.OVI != null)
      .map((r, i) => ({ id: i, ORI: r.ori.ORI as number, OVI: r.ovi.OVI as number }));
  }, [aggregate]);

  const fourAxisRows = useMemo(() => {
    if (!aggregate?.scores) return [];
    const s = aggregate.scores;
    return buildFourAxisRows({
      ohi: isEnabled("OHI") ? s.ohi.overall : null,
      ori: isEnabled("ORI") ? s.ori.ORI : null,
      ovi: isEnabled("OVI") ? s.ovi.OVI : null,
      oai: isEnabled("OAI") ? s.oai.OAI : null,
    }).filter((r) => r.score != null);
  }, [aggregate, enabled]);

  const hierarchyRows = aggregate?.teams ?? [];
  const childrenOf = (parentId: string | null) =>
    hierarchyRows.filter((r) => (r.parentId ?? null) === parentId);
  const currentChildren = childrenOf(selectedNodeId);
  const visibleChildren = currentChildren.filter((t) => !t.hidden);

  if (loading) return <p className="text-sm text-muted">집계 중…</p>;
  if (!wave) return <p className="text-sm text-muted">캠페인을 찾을 수 없습니다.</p>;

  const hidden = aggregate?.hidden ?? true;
  const showNarratives = reportConfig?.showNarratives !== false;
  const showGapMatrix = reportConfig?.showGapMatrix !== false;

  return (
    <div className="arc-report report-print-wrap print-root mx-auto max-w-5xl space-y-6 pb-16">
      <div className="report-print-letterhead hidden print:mb-6 print:block" aria-hidden>
        <div className="flex items-center justify-between border-b-2 border-double border-gold/50 pb-4">
          <Logo size={28} color="#111" variant="mono" />
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">ARC Index Report</p>
            <p className="mt-1 text-sm text-muted">
              {wave.organizationName ?? "조직"} · Wave {wave.waveNumber}
            </p>
            <p className="text-xs text-muted">발급일 {formatReportDate()}</p>
          </div>
        </div>
      </div>

      <div className="print-hide">
        <Link
          href={
            wave.organizationId
              ? `/admin/organizations/${wave.organizationId}/waves/${waveId}`
              : `/admin/diagnostic/waves/${waveId}`
          }
          className="text-sm text-accent hover:underline"
        >
          ← 웨이브 상세
        </Link>
      </div>

      <header className="arc-score-hero print:border print:border-gold/30">
        <div className="print-hide flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="arc-score-hero__eyebrow">ARC Index Diagnostic</p>
            <h1 className="arc-score-hero__title">
              조직 진단 보고서 — Wave {wave.waveNumber}
              {wave.label ? ` · ${wave.label}` : ""}
            </h1>
            <p className="arc-score-hero__meta">
              {wave.organizationName ? `${wave.organizationName} · ` : ""}
              활성 섹션 {wave.sectionBadge} · 응답 {wave.responseCount}건
              {collectionRateMeta ? ` · ${collectionRateMeta}` : ""}
              {reportConfig?.instrumentVersionSnapshot
                ? ` · 설문 ${reportConfig.instrumentVersionSnapshot}`
                : ""}
            </p>
          </div>
          <PrintButton
            label="PDF 저장"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
          />
        </div>
        <div className="hidden print:block">
          <p className="arc-score-hero__eyebrow">ARC Index Diagnostic</p>
          <h1 className="arc-score-hero__title">
            조직 진단 보고서 — Wave {wave.waveNumber}
            {wave.label ? ` · ${wave.label}` : ""}
          </h1>
        </div>
      </header>

      <DiagnosticLongitudinalPanel waveId={waveId} apiBase="admin" />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as ReportTab)}
        className="arc-report-tabs print-hide gap-0"
      >
        <TabsList
          variant="line"
          className="admin-studio-tabs h-auto w-full flex-wrap justify-start gap-2 rounded-none border-0 bg-transparent p-0"
          aria-label="보고서 섹션"
        >
          {visibleTabs.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className={`nav-pill ${tab === key ? "nav-pill-active" : ""}`}
            >
              {REPORT_TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {hidden ? (
        <SampleInsufficient sampleSize={aggregate?.sampleSize} minGroupSize={aggregate?.minGroupSize} />
      ) : (
        <>
          {visibleTabs.includes("summary") && (
            <ReportSection
              id="summary"
              title="종합 진단"
              subtitle="4축 핵심 지표와 우선 개입 포인트"
              active={tab === "summary"}
            >
              <ReportGuideCard defaultOpen />

              {showNarratives && executiveSummary && (
                <ExecutiveSummaryCard parts={executiveSummary} />
              )}

              <ScoreHero
                title="4축 조직 펄스"
                meta={`N=${aggregate?.sampleSize ?? 0}${collectionRateMeta ? ` · ${collectionRateMeta}` : ""}`}
                axes={[
                  ...(isEnabled("OHI")
                    ? [
                        {
                          code: "OHI",
                          value: aggregate?.scores?.ohi.overall,
                          band: aggregate?.scores?.ohi.band,
                          hint:
                            aggregate?.scores?.ohi.riskIndex != null
                              ? `Risk ${Math.round(aggregate.scores.ohi.riskIndex * 100)}%`
                              : undefined,
                          meaning: buildAxisMeaningLine(
                            "OHI",
                            aggregate?.scores?.ohi.overall,
                            aggregate?.scores?.ohi.band,
                          ),
                        },
                      ]
                    : []),
                  ...(isEnabled("ORI")
                    ? [
                        {
                          code: "ORI",
                          value: aggregate?.scores?.ori.ORI,
                          band: aggregate?.scores?.ori.band,
                          meaning: buildAxisMeaningLine(
                            "ORI",
                            aggregate?.scores?.ori.ORI,
                            aggregate?.scores?.ori.band,
                          ),
                        },
                      ]
                    : []),
                  ...(isEnabled("OVI")
                    ? [
                        {
                          code: "OVI",
                          value: aggregate?.scores?.ovi.OVI,
                          band: aggregate?.scores?.ovi.band,
                          meaning: buildAxisMeaningLine(
                            "OVI",
                            aggregate?.scores?.ovi.OVI,
                            aggregate?.scores?.ovi.band,
                          ),
                        },
                      ]
                    : []),
                  ...(isEnabled("OAI")
                    ? [
                        {
                          code: "OAI",
                          value: aggregate?.scores?.oai.OAI,
                          band: aggregate?.scores?.oai.band,
                          meaning: buildAxisMeaningLine(
                            "OAI",
                            aggregate?.scores?.oai.OAI,
                            aggregate?.scores?.oai.band,
                          ),
                        },
                      ]
                    : []),
                ]}
              />

              {riskyPct != null && (
                <div className="card-luxe flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs font-semibold text-foreground">고위험 세그먼트</p>
                    <p className="text-[11px] text-muted">
                      번아웃위험형 + 이탈예고형 (LPA) — 개인 인사 자료가 아닌 지원 신호입니다
                    </p>
                  </div>
                  <p className="text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">{riskyPct}%</p>
                </div>
              )}

              {keyFindings.length > 0 && showNarratives && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">핵심 발견 · 다음에 할 일</h3>
                    <p className="mt-0.5 text-xs text-muted">숫자 요약이 아니라, 우선 손댈 포인트를 골라 둔 목록입니다.</p>
                  </div>
                  {keyFindings.map((f) => (
                    <FindingCard key={f.rank} finding={f} />
                  ))}
                </div>
              )}

              {fourAxisRows.length > 0 && (
                <AnalysisTable
                  title="4축 종합 분석표"
                  subtitle="OHI · ORI · OVI · OAI — 기준 3.5"
                  rows={fourAxisRows}
                />
              )}

              {radarData.length >= 2 && (
                <div className="card-luxe p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold">4축 레이더</h3>
                    <AxisDefinitionsHint />
                  </div>
                  <ArcRadar
                    data={radarData}
                    caption={
                      <>
                        <p>{RADAR_AXIS_CAPTION}</p>
                        {aggregate?.scores?.oaiPattern ? (
                          <p className="font-medium text-foreground/80">
                            {aggregate.scores.oaiPattern.pattern} — {aggregate.scores.oaiPattern.message}
                          </p>
                        ) : null}
                        <p className="opacity-80">만점 {ARC_SCALE_MAX.toFixed(1)} · 척도 고정 · 기준선 3.5</p>
                      </>
                    }
                  />
                </div>
              )}

              <CausalFlowCard summary={aggregate?.driverImportance} />

              {velocityScatter.length >= 5 && isEnabled("ORI") && isEnabled("OVI") && (
                <div className="card-luxe p-4">
                  <h3 className="mb-1 text-sm font-semibold">4축 교차 — ORI × OVI 포지셔닝</h3>
                  <p className="mb-3 text-xs text-muted">
                    응답자 단위 (N={velocityScatter.length}) · X=준비도(ORI) · Y=실행속도(OVI) · 기준선 3.5
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="ORI" domain={[1, 5]} tick={{ fontSize: 10 }} tickFormatter={scoreAxisTick} />
                        <YAxis type="number" dataKey="OVI" domain={[1, 5]} tick={{ fontSize: 10 }} tickFormatter={scoreAxisTick} />
                        <ZAxis range={[20, 20]} />
                        <ReferenceArea
                          x1={3.5}
                          x2={5}
                          y1={3.5}
                          y2={5}
                          fill="#10b981"
                          fillOpacity={0.04}
                          label={{ value: "건강하게 빠름", position: "insideTopRight", fontSize: 10, fill: "#94a3b8" }}
                        />
                        <ReferenceArea
                          x1={1}
                          x2={3.5}
                          y1={3.5}
                          y2={5}
                          fill="#f59e0b"
                          fillOpacity={0.04}
                          label={{ value: "빠른 오류 위험", position: "insideTopLeft", fontSize: 10, fill: "#94a3b8" }}
                        />
                        <ReferenceArea
                          x1={3.5}
                          x2={5}
                          y1={1}
                          y2={3.5}
                          fill="#64748b"
                          fillOpacity={0.04}
                          label={{ value: "준비됐지만 정체", position: "insideBottomRight", fontSize: 10, fill: "#94a3b8" }}
                        />
                        <ReferenceArea
                          x1={1}
                          x2={3.5}
                          y1={1}
                          y2={3.5}
                          fill="#ef4444"
                          fillOpacity={0.03}
                          label={{ value: "정체", position: "insideBottomLeft", fontSize: 10, fill: "#94a3b8" }}
                        />
                        <ReferenceLine x={3.5} stroke="#e2e8f0" />
                        <ReferenceLine y={3.5} stroke="#e2e8f0" />
                        <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                        <Scatter data={velocityScatter} fill="#64748b" fillOpacity={0.5} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <OriOviQuadrantLegend
                    activeKey={
                      buildOriOviQuadrantGuide(
                        aggregate?.scores?.ori.ORI ?? null,
                        aggregate?.scores?.ovi.OVI ?? null,
                      )?.key ?? null
                    }
                  />
                </div>
              )}

              {prescriptions.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">우선 개입 (Top 3)</h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {prescriptions.slice(0, 3).map((p) => (
                      <PrescriptionCard key={p.id} item={p} />
                    ))}
                  </div>
                </div>
              )}

              {hierarchyRows.length > 0 && showGapMatrix && (
                <TeamsOverview
                  waveId={waveId}
                  organizationId={wave.organizationId ?? null}
                  aggregate={aggregate}
                  hierarchyRows={hierarchyRows}
                  selectedNodeId={selectedNodeId}
                  setSelectedNodeId={setSelectedNodeId}
                  isEnabled={isEnabled}
                  visibleChildren={visibleChildren}
                />
              )}
            </ReportSection>
          )}

          {visibleTabs.includes("ohi") && isEnabled("OHI") && aggregate?.scores?.ohi && (
            <ReportSection id="ohi" title="OHI — 조직 건강" subtitle="SE · 드라이버 · IPA · Risk" active={tab === "ohi"}>
              <OhiReportSection
                ohi={aggregate.scores.ohi}
                driverImportance={aggregate.driverImportance}
                teamLevelDriverImportance={aggregate.teamLevelDriverImportance}
                itemAverages={aggregate.itemAverages}
                hvAvg={aggregate.scores.ovi.HV}
                lpaSlot={<LpaCard lpa={aggregate.lpa} />}
                iccSlot={<IccCard reliability={aggregate.teamReliability} />}
                openTextSlot={<OpenTextThemesCard report={openTextThemes} loading={openTextLoading} />}
              />
            </ReportSection>
          )}

          {visibleTabs.includes("ori") && isEnabled("ORI") && aggregate?.scores?.ori && (
            <ReportSection id="ori" title="ORI — 조직 준비도" subtitle="변화 역량 · AX 기회 · Opportunity Score" active={tab === "ori"}>
              <OriReportSection
                ori={aggregate.scores.ori}
                itemAverages={aggregate.itemAverages}
                openTextThemes={openTextThemes}
                openTextLoading={openTextLoading}
              />
            </ReportSection>
          )}

          {visibleTabs.includes("ovi") && isEnabled("OVI") && aggregate?.scores?.ovi && (
            <ReportSection id="ovi" title="OVI — 조직 속도" subtitle="건강·실행·AX 속도 · 동적 정합성" active={tab === "ovi"}>
              <OviReportSection
                ovi={aggregate.scores.ovi}
                itemAverages={aggregate.itemAverages}
                perRespondent={aggregate.perRespondent}
                openTextThemes={openTextThemes}
                openTextLoading={openTextLoading}
              />
            </ReportSection>
          )}

          {visibleTabs.includes("oai") && isEnabled("OAI") && aggregate?.scores?.oai && (
            <ReportSection id="oai" title="OAI — 조직 정렬" subtitle="전략·에너지·결과 정렬 · 4축 통합" active={tab === "oai"}>
              <OaiReportSection
                oai={aggregate.scores.oai}
                ohi={aggregate.scores.ohi.overall}
                ori={aggregate.scores.ori.ORI}
                ovi={aggregate.scores.ovi.OVI}
                oaiPattern={aggregate.scores.oaiPattern}
                itemAverages={aggregate.itemAverages}
                openTextThemes={openTextThemes}
                openTextLoading={openTextLoading}
              />
            </ReportSection>
          )}

          {visibleTabs.includes("orgs") && (
            <ReportSection
              id="orgs"
              title="조직별 분석"
              subtitle="본부 · 부 · 팀 수준 4축 비교 · Gap · 드라이버 편차"
              active={tab === "orgs"}
            >
              <OrgReportSection
                waveId={waveId}
                organizationId={wave.organizationId ?? null}
                teams={hierarchyRows}
                gapMatrix={showGapMatrix ? aggregate?.gapMatrix : null}
                isEnabled={isEnabled}
                orgScores={
                  aggregate?.scores
                    ? {
                        ohi: aggregate.scores.ohi.overall,
                        ori: aggregate.scores.ori.ORI,
                        ovi: aggregate.scores.ovi.OVI,
                        oai: aggregate.scores.oai.OAI,
                      }
                    : undefined
                }
              />
            </ReportSection>
          )}

          {visibleTabs.includes("prescription") && (
            <ReportSection id="prescription" title="처방 · 개입 로드맵" subtitle="규칙 기반 우선순위 (재현 가능)" active={tab === "prescription"}>
              <p className="text-xs text-muted report-prose">
                IPA(β회귀)·HLM-lite·ICC·LPA·ORI 기회·OAI 패턴을 결합한 결정론적 처방입니다. 번호가 낮을수록 우선순위가 높습니다.
              </p>
              {prescriptions.length === 0 ? (
                <div className="card-luxe p-6 text-center text-sm text-muted">특별히 우선 개입이 필요한 항목이 없습니다.</div>
              ) : (
                <>
                  <PrescriptionTable items={prescriptions} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {prescriptions.map((p) => (
                      <PrescriptionCard key={p.id} item={p} showWave />
                    ))}
                  </div>
                </>
              )}
              {waveGoals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Wave 2 → 3 목표</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {waveGoals.map((g) => (
                      <WaveGoalCard key={g.wave} goal={g} />
                    ))}
                  </div>
                </div>
              )}
            </ReportSection>
          )}
        </>
      )}
    </div>
  );
}

function TeamsOverview({
  waveId,
  organizationId,
  aggregate,
  hierarchyRows,
  selectedNodeId,
  setSelectedNodeId,
  isEnabled,
  visibleChildren,
}: {
  waveId: string;
  organizationId?: string | null;
  aggregate: Scores | null;
  hierarchyRows: NonNullable<Scores["teams"]>;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  isEnabled: (code: string) => boolean;
  visibleChildren: NonNullable<Scores["teams"]>;
}) {
  const childBarData = visibleChildren.map((t) => ({
    name: t.teamName.length > 10 ? `${t.teamName.slice(0, 9)}…` : t.teamName,
    OHI: t.OHI_SE ?? 0,
    ORI: t.ORI ?? 0,
    OVI: t.OVI ?? 0,
    OAI: t.OAI ?? 0,
  }));

  const gapTeams = aggregate?.gapMatrix?.teams?.filter((t) => t.ORI != null && t.OVI != null) ?? [];
  const teamGapRows = gapTeams.map((t) => ({
    id: t.teamId,
    label: t.teamName,
    score: t.ORI,
    benchmark: t.OVI,
    gap: t.ORI != null && t.OVI != null ? t.ORI - t.OVI : null,
    status: scoreStatus(t.OVI),
    note: quadrantLabel(t.quadrant),
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">팀별 · Gap 매트릭스</h3>
      <div className="print-hide flex flex-wrap gap-2">
        <button
          type="button"
          className={`nav-pill text-xs ${selectedNodeId === null ? "nav-pill-active" : ""}`}
          onClick={() => setSelectedNodeId(null)}
        >
          전사
        </button>
        {hierarchyRows
          .filter((n) => n.level === "DIVISION")
          .map((n) => (
            <button
              key={n.teamId}
              type="button"
              className={`nav-pill text-xs ${selectedNodeId === n.teamId ? "nav-pill-active" : ""}`}
              onClick={() => setSelectedNodeId(n.teamId)}
            >
              {n.teamName}
            </button>
          ))}
      </div>

      {selectedNodeId === null && aggregate?.gapMatrix?.mode === "GAP_MATRIX" && gapTeams.length >= 2 && (
        <div className="card-luxe p-4">
          <h4 className="mb-2 text-sm font-semibold">ORI × OVI Gap 매트릭스</h4>
          <QuadrantLegend />
          <div className="mt-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="ORI" name="ORI" domain={[1, 5]} tickFormatter={scoreAxisTick} />
                <YAxis type="number" dataKey="OVI" name="OVI" domain={[1, 5]} tickFormatter={scoreAxisTick} />
                <ZAxis range={[100, 400]} />
                {aggregate.gapMatrix?.xBase != null && (
                  <ReferenceLine x={aggregate.gapMatrix.xBase} stroke="#94a3b8" strokeDasharray="4 4" />
                )}
                {aggregate.gapMatrix?.yBase != null && (
                  <ReferenceLine y={aggregate.gapMatrix.yBase} stroke="#94a3b8" strokeDasharray="4 4" />
                )}
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number) => formatScore(v)}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { teamName?: string; quadrant?: string };
                    return p?.teamName ? `${p.teamName} (${quadrantLabel(p.quadrant ?? null)})` : "";
                  }}
                />
                <Scatter data={gapTeams} name="팀">
                  {gapTeams.map((t) => (
                    <Cell key={t.teamId} fill={QUADRANT_FILL[t.quadrant ?? ""] ?? "#c9a227"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
            {gapTeams.slice(0, 8).map((t) => (
              <li key={t.teamId} className="text-muted">
                <span className="font-medium text-foreground">{t.teamName}</span> — {quadrantLabel(t.quadrant)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedNodeId === null &&
        aggregate?.gapMatrix?.mode === "OLS_RESIDUAL" &&
        (aggregate.gapMatrix.teams?.length ?? 0) >= 2 && (
          <div className="card-luxe p-4">
            <h4 className="mb-1 text-sm font-semibold">ORI × OVI OLS 잔차 분석</h4>
            <p className="mb-3 text-xs text-muted">
              {aggregate.gapMatrix.note}
              {aggregate.gapMatrix.rSquared != null
                ? ` · R²=${formatScore(aggregate.gapMatrix.rSquared)}`
                : ""}
              {aggregate.gapMatrix.n != null ? ` · n=${aggregate.gapMatrix.n}` : ""}
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="ORI" name="ORI" domain={[1, 5]} tickFormatter={scoreAxisTick} />
                  <YAxis type="number" dataKey="OVI" name="OVI" domain={[1, 5]} tickFormatter={scoreAxisTick} />
                  <ZAxis range={[100, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(v: number) => formatScore(v)}
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
                  <Scatter data={aggregate.gapMatrix.teams ?? []} name="팀">
                    {(aggregate.gapMatrix.teams ?? []).map((t) => (
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
            <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
              {(aggregate.gapMatrix.teams ?? []).slice(0, 8).map((t) => (
                <li key={t.teamId} className="text-muted">
                  <span className="font-medium text-foreground">{t.teamName}</span>
                  {" — "}
                  {quadrantLabel(t.typology ?? null)}
                  {t.priorityManage ? " · 우선관리" : ""}
                  {t.fastErrorWarning ? " · 빠른오류" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

      {teamGapRows.length > 0 && (
        <AnalysisTable
          title="팀 Gap 분석표"
          subtitle="ORI(준비) · OVI(속도) · 사분면"
          rows={teamGapRows}
        />
      )}

      {childBarData.length >= 2 && (
        <div className="card-luxe p-4">
          <h4 className="mb-2 text-sm font-semibold">하위 조직 4축 비교</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={childBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tickFormatter={scoreAxisTick} />
                <Tooltip formatter={(v: number) => formatScore(v)} />
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

      <Link
        href={
          organizationId
            ? `/admin/organizations/${organizationId}/waves/${waveId}#team-links`
            : `/admin/diagnostic/waves/${waveId}#team-links`
        }
        className="print-hide text-xs text-accent hover:underline"
      >
        팀별 링크 관리 →
      </Link>
    </div>
  );
}

function CausalFlowCard({ summary }: { summary?: DriverImportanceSummary }) {
  if (!summary || summary.insufficientData) return null;
  const top = [...summary.entries]
    .filter((e) => e.beta != null && e.priority === "FOCUS")
    .sort((a, b) => (b.beta ?? 0) - (a.beta ?? 0))[0];
  if (!top) return null;
  const flow = [DRIVER_LABELS[top.code] ?? top.code, "SE", "ORI/OVI/OAI"];
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold">인과 흐름 — 1순위 개입 지점</h3>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {flow.map((node, i) => (
          <span key={node} className="flex items-center gap-2">
            <span className="rounded-full bg-gold/10 px-3 py-1.5 font-medium">{node}</span>
            {i < flow.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted" />}
          </span>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        이 경로는 Burke-Litwin 조직변화 모형에 기반한 이론적 가정이며, 이번 데이터로
        인과관계가 통계적으로 확정된 것은 아닙니다.
        {summary.n > 0 ? ` (β 참고 · n=${summary.n})` : ""}
      </p>
    </div>
  );
}

function LpaCard({ lpa }: { lpa?: Scores["lpa"] }) {
  if (!lpa) return null;
  if (lpa.insufficientData) {
    return (
      <div className="card-luxe border-dashed p-4 text-xs text-muted">
        LPA — 표본 부족 (N={lpa.n}, 최소 30명)
      </div>
    );
  }
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold">LPA — 구성원 유형</h3>
      <div className="mt-3 space-y-2">
        {lpa.profiles.map((p) => (
          <div key={p.key}>
            <div className="flex justify-between text-xs">
              <span className="font-medium">{p.label}</span>
              <span className="text-muted">{Math.round(p.proportion * 100)}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-black/5 dark:bg-white/10">
              <div className={`h-2 rounded-full ${LPA_COLOR[p.label] ?? "bg-slate-400"}`} style={{ width: `${Math.max(2, p.proportion * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IccCard({ reliability }: { reliability?: Scores["teamReliability"] }) {
  if (!reliability || reliability.icc == null) {
    return (
      <div className="card-luxe border-dashed p-4 text-xs text-muted">
        ICC — 팀 2개 이상 필요
      </div>
    );
  }
  const guide = buildIccInterpretation(reliability.icc);
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold">ICC(1) — 팀간 신뢰도</h3>
      <p className="mt-2 text-2xl font-bold">{formatScore(reliability.icc)}</p>
      <p className="mt-1 text-xs text-muted">팀 {reliability.k}개 · N={reliability.n}</p>
      {guide ? (
        <p className="mt-2 text-xs leading-relaxed text-foreground">{guide}</p>
      ) : null}
      {reliability.interpretation && reliability.interpretation !== guide ? (
        <p className="mt-1 text-[11px] text-muted">{reliability.interpretation}</p>
      ) : null}
    </div>
  );
}

function OpenTextThemesCard({ report, loading }: { report: OpenTextThemeReport | null; loading: boolean }) {
  if (loading) return <div className="card-luxe p-4 text-center text-xs text-muted">주관식 테마 분석 중…</div>;
  if (!report?.sections.length) return null;
  return (
    <div className="card-luxe space-y-3 p-4">
      <h3 className="text-sm font-semibold">주관식 응답 테마</h3>
      {report.sections.map((section) => (
        <div key={section.subscaleCode} className="border-t border-black/5 pt-3 first:border-t-0 dark:border-white/10">
          <p className="text-xs font-medium">{section.subscaleName}</p>
          {section.themes.slice(0, 3).map((theme, i) => (
            <div key={i} className="mt-2 rounded-lg bg-black/[0.03] p-2 dark:bg-white/5">
              <p className="text-xs font-medium">{theme.title}</p>
              {theme.quotes[0] && <p className="mt-1 text-[11px] text-muted">&ldquo;{theme.quotes[0]}&rdquo;</p>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

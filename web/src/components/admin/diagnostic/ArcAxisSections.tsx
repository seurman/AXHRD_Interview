"use client";

import { useMemo } from "react";
import {
  FindingCard,
  MetricTile,
  NarrativeBlock,
  SubscoreBar,
} from "@/components/admin/diagnostic/ArcReportUi";
import { AxisNarrativeBlock } from "@/components/admin/diagnostic/ReportGuideUi";
import { AXIS_DEFINITIONS } from "@/lib/diagnostic/report-guide";
import type { OpenTextThemeReport } from "@/lib/diagnostic/theme-mining";
import {
  buildCdReadinessInsight,
  buildOaiInsights,
  buildOaiWeightedBreakdown,
  buildOpportunityInsight,
  buildOviInsights,
  filterThemesByCodes,
  OAI_DIM_LABELS,
  OAI_OPEN_TEXT_CODES,
  ORI_OPEN_TEXT_CODES,
  ORI_RADAR_LABELS,
  oriBandMessage,
  oaiBandMessage,
  OVI_DIM_LABELS,
  OVI_OPEN_TEXT_CODES,
  oviBandMessage,
  type OaiScores,
  type OriScores,
  type OviScores,
} from "@/lib/diagnostic/axis-report";
import { AnalysisTable } from "@/components/admin/diagnostic/ArcAnalysisUi";
import {
  buildOaiSubscaleRows,
  buildOriSubscaleRows,
  buildOviSubscaleRows,
} from "@/lib/diagnostic/analysis-tables";
import { pickItemRows } from "@/components/admin/diagnostic/OhiReportSection";
import { ArcRadar } from "@/components/admin/diagnostic/ArcRadar";
import { formatScore, scoreAxisTick } from "@/lib/diagnostic/format-score";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
} from "recharts";

function InsightList({ insights }: { insights: Array<{ title: string; body: string; severity: "critical" | "warning" | "info" }> }) {
  if (!insights.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">핵심 인사이트</h3>
      {insights.map((f, i) => (
        <FindingCard key={f.title} finding={{ rank: i + 1, ...f }} />
      ))}
    </div>
  );
}

function AxisOpenText({
  report,
  loading,
  codes,
}: {
  report: OpenTextThemeReport | null;
  loading: boolean;
  codes: string[];
}) {
  const sections = filterThemesByCodes(report, codes);
  if (loading) return <div className="card-luxe p-4 text-center text-xs text-muted">주관식 테마 분석 중…</div>;
  if (!sections.length) return null;
  return (
    <div className="card-luxe space-y-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">주관식 응답 테마</h3>
      {sections.map((section) => (
        <div key={section.subscaleCode} className="border-t border-black/5 pt-3 first:border-t-0 dark:border-white/10">
          <p className="text-xs font-medium">
            {section.subscaleName}
            <span className="ml-2 text-muted">응답 {section.totalResponses}건</span>
          </p>
          {section.mode === "insufficient" ? (
            <p className="mt-1 text-xs text-muted">응답 수 부족으로 테마 분석을 생략합니다.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {section.themes.slice(0, 3).map((theme, i) => (
                <div key={i} className="rounded-lg bg-black/[0.03] p-2.5 dark:bg-white/5">
                  <p className="text-xs font-medium text-foreground">{theme.title}</p>
                  {theme.quotes[0] && (
                    <p className="mt-1 text-[11px] text-muted report-prose">&ldquo;{theme.quotes[0]}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AxMaturityLadder({ stage, label }: { stage: number; label: string }) {
  const stages = ["1 인지", "2 실험", "3 통합", "4 최적화", "5 혁신"];
  return (
    <div className="card-luxe p-4">
      <h3 className="text-sm font-semibold text-foreground">AX 성숙도 5단계</h3>
      <p className="mt-1 text-xs text-muted">{label}</p>
      <div className="mt-4 flex gap-1">
        {stages.map((s, i) => {
          const n = i + 1;
          const active = n === stage;
          const past = n < stage;
          return (
            <div
              key={s}
              className={`flex-1 rounded-lg px-1 py-2 text-center text-[10px] font-medium ${
                active ? "bg-gold text-white" : past ? "bg-gold/25 text-foreground" : "bg-black/5 text-muted dark:bg-white/10"
              }`}
            >
              {s}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OriReportSection({
  ori,
  itemAverages,
  openTextThemes,
  openTextLoading,
}: {
  ori: OriScores;
  itemAverages?: Record<string, number | null>;
  openTextThemes: OpenTextThemeReport | null;
  openTextLoading: boolean;
}) {
  const radarData = useMemo(
    () =>
      [
        { axis: "CD", value: ori.CD },
        { axis: "LA", value: ori.LA },
        { axis: "AXS", value: ori.AXS },
        { axis: "AXC", value: ori.AXC },
      ]
        .filter((d) => d.value != null)
        .map((d) => ({ axis: ORI_RADAR_LABELS[d.axis] ?? d.axis, value: d.value as number })),
    [ori],
  );

  const oppChart =
    ori.opportunity?.AXA != null && ori.opportunity?.AXG != null
      ? [
          { dim: "AXA 수용의지", value: ori.opportunity.AXA },
          { dim: "AXG 거버넌스공포", value: ori.opportunity.AXG },
        ]
      : [];

  const cdInsight = buildCdReadinessInsight(itemAverages?.CD02 ?? null, itemAverages?.CD04 ?? null);
  const oppText = buildOpportunityInsight(ori.opportunity);

  return (
    <>
      <AxisNarrativeBlock
        axisLabel="ORI — Organization Readiness"
        definition={AXIS_DEFINITIONS.ORI.oneLiner}
        interpretation={oriBandMessage(ori.ORI, ori.band)}
      />

      <AnalysisTable
        title="ORI 4요인 분석표"
        subtitle="CD · LA · AX-S · AX-C"
        rows={buildOriSubscaleRows(ori)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="ORI 종합" value={ori.ORI} band={ori.band} />
        <MetricTile label="CD 변화방향" value={ori.CD} />
        <MetricTile label="LA 학습적응" value={ori.LA} />
        <MetricTile
          label="Opportunity"
          value={ori.opportunity?.oppScore ?? null}
          hint={ori.opportunity?.band}
        />
      </div>

      {cdInsight && <FindingCard finding={{ rank: 1, ...cdInsight }} />}

      {radarData.length >= 3 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">변화준비 레이더</h3>
          <ArcRadar data={radarData} heightClass="h-64" />
        </div>
      )}

      <div className="card-luxe grid gap-4 p-4 sm:grid-cols-2">
        <SubscoreBar label="CD 변화 준비 방향" value={ori.CD} />
        <SubscoreBar label="LA 학습·적응 역량" value={ori.LA} />
        <SubscoreBar label="AX-S 전략 준비" value={ori.AXS} />
        <SubscoreBar label="AX-C 역량 준비" value={ori.AXC} />
      </div>

      {oppChart.length === 2 && (
        <div className="card-luxe p-4">
          <h3 className="mb-1 text-sm font-semibold">Opportunity Score — AXA vs AXG</h3>
          <p className="mb-3 text-xs text-muted">AXA(쓰고 싶다) − AXG(못 쓴다) = 구조 vs 의지</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oppChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dim" tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tickFormatter={scoreAxisTick} />
                <Tooltip />
                <ReferenceLine y={3.5} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="value" name="점수" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {oppText && <NarrativeBlock label="Opportunity Score" text={oppText} />}
      {ori.opportunity && (
        <NarrativeBlock
          label="처방 방향"
          text={ori.opportunity.prescription}
        />
      )}

      {ori.axMaturity && <AxMaturityLadder stage={ori.axMaturity.stage} label={ori.axMaturity.label} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricTile label="AX-S 전략" value={ori.AXS} hint="거버넌스·윤리·책임 구조" />
        <MetricTile label="AX-C 역량" value={ori.AXC} hint="활용·검증·교육 역량" />
      </div>

      <AnalysisTable
        title="CD 변화준비 문항 분석"
        subtitle="핵심: CD02 긴장감 · CD04 관행(역)"
        rows={pickItemRows(
          [
            { code: "CD01", label: "변화 방향 명확" },
            { code: "CD02", label: "변화 긴장감 공유" },
            { code: "CD04", label: "관행 변경 난이도(역)" },
            { code: "CD05", label: "지도부 신뢰" },
          ],
          itemAverages,
        )}
      />

      <AnalysisTable
        title="AX Opportunity 문항 분석"
        subtitle="AXA 수용의지 · AXG 거버넌스 공포"
        rows={pickItemRows(
          [
            { code: "AXA01", label: "AI 더 활용 의지" },
            { code: "AXA02", label: "커리어 도움 기대" },
            { code: "AXG01", label: "책임 부담(높을수록 공포)" },
            { code: "AXG02", label: "가이드라인 부재" },
          ],
          itemAverages,
        )}
      />

      <AxisOpenText report={openTextThemes} loading={openTextLoading} codes={ORI_OPEN_TEXT_CODES} />
    </>
  );
}

export function OviReportSection({
  ovi,
  itemAverages,
  perRespondent,
  openTextThemes,
  openTextLoading,
}: {
  ovi: OviScores;
  itemAverages?: Record<string, number | null>;
  perRespondent?: Array<{ ovi: { HV: number | null; AV: number | null; CV: number | null; OVI: number | null } }>;
  openTextThemes: OpenTextThemeReport | null;
  openTextLoading: boolean;
}) {
  const dimChart = useMemo(
    () =>
      (["HV", "CV", "AV"] as const)
        .map((k) => ({ dim: OVI_DIM_LABELS[k], value: ovi[k], key: k }))
        .filter((d) => d.value != null),
    [ovi],
  );

  const hvAvScatter = useMemo(() => {
    if (!perRespondent) return [];
    return perRespondent
      .filter((r) => r.ovi.HV != null && r.ovi.AV != null)
      .map((r, i) => ({
        id: i,
        HV: r.ovi.HV as number,
        AV: r.ovi.AV as number,
        gap: (r.ovi.AV as number) - (r.ovi.HV as number),
      }));
  }, [perRespondent]);

  const insights = buildOviInsights(ovi, itemAverages?.CV01 ?? null);

  return (
    <>
      <AxisNarrativeBlock
        axisLabel="OVI — Organization Velocity"
        definition={AXIS_DEFINITIONS.OVI.oneLiner}
        interpretation={oviBandMessage(ovi.OVI, ovi.band)}
      />

      <AnalysisTable title="OVI 3요소 분석표" subtitle="HV · CV · AV" rows={buildOviSubscaleRows(ovi)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="OVI 종합" value={ovi.OVI} band={ovi.band} />
        <MetricTile label="HV 건강속도" value={ovi.HV} hint={ovi.HV != null && ovi.HV < 2.5 ? "악화 신호" : undefined} />
        <MetricTile label="CV 실행속도" value={ovi.CV} />
        <MetricTile label="AV AX속도" value={ovi.AV} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricTile
          label="동적 정합성 격차"
          value={ovi.dynamicCongruenceGap}
          hint="AV − HV · 양수=속도 과잉"
        />
        <MetricTile
          label="CV01 실행속도"
          value={itemAverages?.CV01 ?? null}
          hint="결정→현장 적용 (핵심)"
        />
        <MetricTile
          label="AV02 업무방식 변화"
          value={itemAverages?.AV02 ?? null}
          hint="AI로 실제 일하는 방식이 달라지는지"
        />
      </div>

      <AnalysisTable
        title="CV 변화실행 문항 분석"
        subtitle="CV01=결정→현장 적용 속도"
        rows={pickItemRows(
          [
            { code: "CV01", label: "결정→현장 속도", note: "핵심 병목 지표" },
            { code: "CV03", label: "관행 축소" },
          ],
          itemAverages,
        )}
      />

      <AnalysisTable
        title="HV 조직건강 속도 문항"
        rows={pickItemRows(
          [
            { code: "HV01", label: "리더십 개선" },
            { code: "HV02", label: "의견 말하기" },
          ],
          itemAverages,
        )}
      />

      <AnalysisTable
        title="AV AX전환 속도 문항"
        rows={pickItemRows(
          [
            { code: "AV01", label: "AI 확산" },
            { code: "AV02", label: "업무방식 변화" },
          ],
          itemAverages,
        )}
      />

      <InsightList insights={insights} />

      {dimChart.length > 0 && (
        <div className="card-luxe p-4">
          <h3 className="mb-1 text-sm font-semibold">OVI 3요소 프로필</h3>
          <p className="mb-3 text-xs text-muted">6개월 변화 방향 척도 · 점선=기준 3.5</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dimChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dim" tick={{ fontSize: 11 }} />
                <YAxis domain={[1, 5]} tickFormatter={scoreAxisTick} />
                <Tooltip />
                <ReferenceLine y={3.5} stroke="#94a3b8" strokeDasharray="4 4" />
                <Bar dataKey="value" name="점수" fill="#c9a227" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card-luxe grid gap-4 p-4 sm:grid-cols-3">
        <SubscoreBar label="HV 조직건강 변화속도" value={ovi.HV} />
        <SubscoreBar label="CV 변화 실행속도" value={ovi.CV} />
        <SubscoreBar label="AV AX 전환속도" value={ovi.AV} />
      </div>

      {hvAvScatter.length >= 5 && (
        <div className="card-luxe p-4">
          <h3 className="mb-1 text-sm font-semibold">개인 포지셔닝 — HV × AV</h3>
          <p className="mb-3 text-xs text-muted">동적 정합성 분포 (N={hvAvScatter.length}) · 대각선 위=속도 과잉</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="HV" name="HV" domain={[1, 5]} tickFormatter={scoreAxisTick} label={{ value: "HV 건강속도", position: "bottom", fontSize: 10 }} />
                <YAxis type="number" dataKey="AV" name="AV" domain={[1, 5]} tickFormatter={scoreAxisTick} label={{ value: "AV 실제속도", angle: -90, position: "left", fontSize: 10 }} />
                <ZAxis range={[24, 24]} />
                <ReferenceLine x={3.5} stroke="#e2e8f0" strokeDasharray="4 4" />
                <ReferenceLine y={3.5} stroke="#e2e8f0" strokeDasharray="4 4" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={hvAvScatter} fill="#c9a227" fillOpacity={0.55} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card-luxe overflow-x-auto p-4 text-xs">
        <h3 className="mb-2 text-sm font-semibold text-foreground">OVI 해석 기준</h3>
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-black/10 text-muted dark:border-white/10">
              <th className="py-1 pr-2">점수</th>
              <th className="py-1 pr-2">판정</th>
              <th className="py-1">메시지</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {[
              ["4.5~5.0", "빠른 개선", "가속 중 — 모멘텀 유지"],
              ["3.5~4.4", "개선 중", "CV01 병목 점검"],
              ["2.5~3.4", "정체", "CV01·AV02 즉시 확인"],
              ["1.5~2.4", "악화 중", "Risk Index 연계 긴급 개입"],
              ["1.0~1.4", "급속 악화", "OHI·ORI 긴급 점검"],
            ].map(([range, band, msg]) => (
              <tr key={range} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1.5 pr-2 tabular-nums">{range}</td>
                <td className="py-1.5 pr-2 font-medium text-foreground">{band}</td>
                <td className="py-1.5 report-prose">{msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AxisOpenText report={openTextThemes} loading={openTextLoading} codes={OVI_OPEN_TEXT_CODES} />
    </>
  );
}

export function OaiReportSection({
  oai,
  ohi,
  ori,
  ovi,
  oaiPattern,
  itemAverages,
  openTextThemes,
  openTextLoading,
}: {
  oai: OaiScores;
  ohi: number | null;
  ori: number | null;
  ovi: number | null;
  oaiPattern: { pattern: string; message: string } | null;
  itemAverages?: Record<string, number | null>;
  openTextThemes: OpenTextThemeReport | null;
  openTextLoading: boolean;
}) {
  const breakdown = buildOaiWeightedBreakdown(oai.SA, oai.EA, oai.OA);
  const insights = buildOaiInsights(oai, ohi, ori, ovi);

  const weightChart = breakdown
    ? [
        { dim: "SA×0.40", value: breakdown.SA.contribution, raw: breakdown.SA.score },
        { dim: "EA×0.35", value: breakdown.EA.contribution, raw: breakdown.EA.score },
        { dim: "OA×0.25", value: breakdown.OA.contribution, raw: breakdown.OA.score },
      ]
    : [];

  const radarData = useMemo(
    () =>
      (["SA", "EA", "OA"] as const)
        .filter((k) => oai[k] != null)
        .map((k) => ({ axis: OAI_DIM_LABELS[k], value: oai[k] as number })),
    [oai],
  );

  return (
    <>
      <AxisNarrativeBlock
        axisLabel="OAI — Organization Alignment"
        definition={AXIS_DEFINITIONS.OAI.oneLiner}
        interpretation={oaiBandMessage(oai.OAI, oai.band)}
      />

      <AnalysisTable
        title="OAI 3축 분석표"
        subtitle="SA 40% · EA 35% · OA 25%"
        rows={buildOaiSubscaleRows(oai)}
        columns="weighted"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="OAI 종합" value={oai.OAI} band={oai.band} />
        <MetricTile label="SA 전략정렬" value={oai.SA} hint="가중 40%" />
        <MetricTile label="EA 에너지정렬" value={oai.EA} hint="가중 35%" />
        <MetricTile label="OA 결과정렬" value={oai.OA} hint="가중 25%" />
      </div>

      {breakdown && (
        <NarrativeBlock
          label="OAI 산출"
          text={`OAI = SA(${formatScore(breakdown.SA.score)})×0.40 + EA(${formatScore(breakdown.EA.score)})×0.35 + OA(${formatScore(breakdown.OA.score)})×0.25 = ${formatScore(breakdown.total)}`}
        />
      )}

      <InsightList insights={insights} />

      {radarData.length === 3 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">정렬 3축 레이더</h3>
          <ArcRadar data={radarData} fill="#64748b" stroke="#c9a227" />
        </div>
      )}

      <div className="card-luxe grid gap-4 p-4 sm:grid-cols-3">
        <SubscoreBar label="SA 전략-현장 연결" value={oai.SA} />
        <SubscoreBar label="EA 에너지 방향" value={oai.EA} />
        <SubscoreBar label="OA 결과 수렴" value={oai.OA} />
      </div>

      {weightChart.length > 0 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">가중 기여도</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weightChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dim" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 5]} tickFormatter={scoreAxisTick} />
                <Tooltip formatter={(v: number, name: string) => [formatScore(v), name === "value" ? "기여" : name]} />
                <Legend />
                <Bar dataKey="value" name="가중 기여" fill="#c9a227" radius={[4, 4, 0, 0]} />
                <Bar dataKey="raw" name="원점수" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <AnalysisTable
        title="SA 전략정렬 문항"
        rows={pickItemRows(
          [
            { code: "SA01", label: "전략-업무 연결" },
            { code: "SA02", label: "우선순위 일치" },
          ],
          itemAverages,
        )}
      />

      <AnalysisTable
        title="EA 에너지정렬 문항"
        rows={pickItemRows(
          [
            { code: "EA01", label: "에너지 투입 일치" },
            { code: "EA02", label: "노력→결과 연결" },
          ],
          itemAverages,
        )}
      />

      <AnalysisTable
        title="OA 결과정렬 문항"
        rows={pickItemRows(
          [
            { code: "OA01", label: "의도한 결과" },
            { code: "OA06", label: "KPI 방향성" },
          ],
          itemAverages,
        )}
      />

      {oaiPattern && (
        <NarrativeBlock label={`4축 패턴 — ${oaiPattern.pattern}`} text={oaiPattern.message} />
      )}

      <div className="card-luxe overflow-x-auto p-4 text-xs">
        <h3 className="mb-2 text-sm font-semibold text-foreground">4축 통합 해석</h3>
        <table className="w-full min-w-[520px] text-left">
          <thead>
            <tr className="border-b border-black/10 text-muted dark:border-white/10">
              <th className="py-1 pr-2">패턴</th>
              <th className="py-1">의미</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {[
              ["OHI↑ OVI↑ OAI↓", "빠른 오류 — 건강·빠름, 방향 어긋남"],
              ["OHI↓ OVI↓ OAI↑", "느리지만 정확 — 회복 후 성과"],
              ["ORI↑ OAI↓", "준비됐지만 방향 없음 — 역량 낭비"],
              ["OVI↑ OAI↓", "무방향 질주 — 속도만 빠름"],
              ["4축 모두 높음", "이상적 조직 — Wave 2 설계"],
            ].map(([pat, msg]) => (
              <tr key={pat} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1.5 pr-2 font-medium text-foreground">{pat}</td>
                <td className="py-1.5 report-prose">{msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-luxe overflow-x-auto p-4 text-xs">
        <h3 className="mb-2 text-sm font-semibold text-foreground">OAI 해석 기준</h3>
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="border-b border-black/10 text-muted dark:border-white/10">
              <th className="py-1 pr-2">점수</th>
              <th className="py-1 pr-2">판정</th>
              <th className="py-1">처방</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {[
              ["4.5~5.0", "방향 정렬 탁월", "모멘텀 유지·번아웃 예방"],
              ["3.5~4.4", "방향 정렬 양호", "최약 축 집중 개선"],
              ["2.5~3.4", "부분 정렬", "SA04·EA06 점검"],
              ["1.5~2.4", "방향 이탈", "전략 재정렬 긴급"],
              ["1.0~1.4", "방향 붕괴", "경영진 직접 개입"],
            ].map(([range, band, msg]) => (
              <tr key={range} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1.5 pr-2 tabular-nums">{range}</td>
                <td className="py-1.5 pr-2 font-medium text-foreground">{band}</td>
                <td className="py-1.5 report-prose">{msg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AxisOpenText report={openTextThemes} loading={openTextLoading} codes={OAI_OPEN_TEXT_CODES} />
    </>
  );
}

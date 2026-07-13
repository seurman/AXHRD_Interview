"use client";

import { useMemo } from "react";
import { MetricTile, NarrativeBlock, SubscoreBar } from "@/components/admin/diagnostic/ArcReportUi";
import { AnalysisTable, IpaQuadrantChart } from "@/components/admin/diagnostic/ArcAnalysisUi";
import {
  buildDriverAnalysisRows,
  buildItemAnalysisRows,
  buildSeAnalysisRows,
  buildTlAnalysisRows,
  scoreStatus,
} from "@/lib/diagnostic/analysis-tables";
import { healthBand } from "@/lib/diagnostic/arc-scoring";
import { DRIVER_LABELS } from "@/lib/diagnostic/report-narratives";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OhiScores = {
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
  drivers: Record<string, { current: number | null; importance: number | null }>;
};

type DriverImportance = {
  entries: Array<{
    code: string;
    current?: number | null;
    beta: number | null;
    priority: "FOCUS" | "MAINTAIN" | null;
  }>;
  rSquared: number | null;
  n: number;
  insufficientData: boolean;
};

function ohiBandMessage(overall: number | null, band: string | null): string {
  const b = band ?? (overall != null ? healthBand(overall) : null);
  if (b === "탁월") return "조직 건강이 매우 양호합니다. SE 유지와 드라이버 과투자 영역을 점검하세요.";
  if (b === "양호") return "전반적 건강은 양호합니다. IPA 집중개선(Focus) 드라이버에 자원을 배분하세요.";
  if (b === "보통") return "강점과 약점이 혼재합니다. 중요도-현재 격차가 큰 드라이버부터 개선하세요.";
  return "조직 건강에 주의가 필요합니다. Risk Index·SE 3요인·심리적안전(PS)을 우선 점검하세요.";
}

function RiskBreakdownTable({
  riskIndex,
  sec03,
  eAvg,
  hvAvg,
}: {
  riskIndex: number | null;
  sec03: number | null;
  eAvg: number | null;
  hvAvg: number | null;
}) {
  const rows = [
    { signal: "SEC03 미래연결감", score: sec03, threshold: "≤2.0 위험", weight: "40%" },
    { signal: "E 활력 평균", score: eAvg, threshold: "≤2.5 위험", weight: "30%" },
    { signal: "HV 건강속도", score: hvAvg, threshold: "<2.5 악화", weight: "30%" },
  ];
  return (
    <div className="card-luxe overflow-x-auto p-4">
      <h3 className="text-sm font-semibold text-foreground">Risk Index 구성 신호</h3>
      <p className="mt-0.5 text-xs text-muted">
        복합 위험 지수 {riskIndex != null ? `${Math.round(riskIndex * 100)}%` : "—"} — 이탈·번아웃 조기 경보
      </p>
      <table className="mt-3 w-full min-w-[400px] text-xs">
        <thead>
          <tr className="border-b border-black/10 text-muted dark:border-white/10">
            <th className="py-2 pr-3 text-left">신호</th>
            <th className="py-2 pr-3 text-left">점수</th>
            <th className="py-2 pr-3 text-left">임계</th>
            <th className="py-2 text-left">가중</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.signal} className="border-b border-black/5 dark:border-white/5">
              <td className="py-2 pr-3 text-foreground">{r.signal}</td>
              <td className="py-2 pr-3 tabular-nums">{r.score?.toFixed(2) ?? "—"}</td>
              <td className="py-2 pr-3 text-muted">{r.threshold}</td>
              <td className="py-2 text-muted">{r.weight}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OhiReportSection({
  ohi,
  driverImportance,
  teamLevelDriverImportance,
  itemAverages,
  hvAvg,
  lpaSlot,
  iccSlot,
  openTextSlot,
}: {
  ohi: OhiScores;
  driverImportance?: DriverImportance;
  teamLevelDriverImportance?: DriverImportance;
  itemAverages?: Record<string, number | null>;
  hvAvg?: number | null;
  lpaSlot?: React.ReactNode;
  iccSlot?: React.ReactNode;
  openTextSlot?: React.ReactNode;
}) {
  const seRows = buildSeAnalysisRows({ E: ohi.E, C: ohi.C, F: ohi.F, SE: ohi.SE });
  const tlRows = buildTlAnalysisRows({
    trust: ohi.TL_trust,
    growth: ohi.TL_growth,
    safety: ohi.TL_safety,
    TL: ohi.TL,
  });
  const driverRows = buildDriverAnalysisRows(ohi.drivers, driverImportance);

  const seRadar = useMemo(
    () =>
      [
        { axis: "활력 E", value: ohi.E },
        { axis: "헌신 C", value: ohi.C },
        { axis: "몰두 F", value: ohi.F },
      ].filter((d) => d.value != null),
    [ohi],
  );

  const gapChartData = useMemo(
    () =>
      Object.entries(ohi.drivers).map(([code, d]) => ({
        label: DRIVER_LABELS[code] ?? code,
        current: d.current ?? 0,
        importance: d.importance ?? 0,
        gap: (d.importance ?? 0) - (d.current ?? 0),
      })),
    [ohi.drivers],
  );

  const ipaChartData = useMemo(() => {
    if (!driverImportance || driverImportance.insufficientData) return [];
    return driverImportance.entries
      .filter((e) => ohi.drivers[e.code]?.current != null && ohi.drivers[e.code]?.importance != null)
      .map((e) => ({
        code: e.code,
        label: DRIVER_LABELS[e.code] ?? e.code,
        current: ohi.drivers[e.code].current as number,
        importance: ohi.drivers[e.code].importance as number,
        beta: e.beta,
        priority: e.priority,
      }));
  }, [driverImportance, ohi.drivers]);

  const driverGapRows = useMemo(
    () =>
      [...gapChartData]
        .sort((a, b) => b.gap - a.gap)
        .slice(0, 5)
        .map((d, i) => ({
          id: `gap-${i}`,
          label: d.label,
          score: d.current,
          benchmark: d.importance,
          gap: d.gap,
          status: scoreStatus(d.current),
          note: d.gap > 0.5 ? "중요도 대비 개선 시급" : d.gap > 0 ? "소폭 개선 여지" : "현상 유지 가능",
        })),
    [gapChartData],
  );

  return (
    <>
      <NarrativeBlock label="OHI 해석" text={ohiBandMessage(ohi.overall, ohi.band)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="OHI 종합" value={ohi.overall} band={ohi.band} />
        <MetricTile label="SE 종합" value={ohi.SE} />
        <MetricTile label="BO 행동결과" value={ohi.BO} hint="번아웃·이직 행동 신호" />
        <MetricTile
          label="Risk Index"
          value={ohi.riskIndex != null ? ohi.riskIndex * 100 : null}
          hint="번아웃·이탈 복합 (%)"
        />
      </div>

      <AnalysisTable title="SE 3요인 분석표" subtitle="종속변인 — 드라이버 IPA의 기준" rows={seRows} />

      {seRadar.length >= 2 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">SE 3요인 레이더</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={seRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                <Radar dataKey="value" stroke="#c9a227" fill="#c9a227" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <AnalysisTable title="팀 리더십(TL) 분석표" subtitle="HLM 보조 · 신뢰·성장·안전" rows={tlRows} />

      <div className="card-luxe grid gap-4 p-4 sm:grid-cols-3">
        <SubscoreBar label="TL 신뢰" value={ohi.TL_trust} />
        <SubscoreBar label="TL 성장" value={ohi.TL_growth} />
        <SubscoreBar label="TL 안전" value={ohi.TL_safety} />
      </div>

      <RiskBreakdownTable
        riskIndex={ohi.riskIndex}
        sec03={itemAverages?.SEC03 ?? null}
        eAvg={ohi.E}
        hvAvg={hvAvg ?? null}
      />

      <AnalysisTable
        title="9개 드라이버 분석표"
        subtitle="현재 · 중요도 · IPA β · 집중개선 판정"
        rows={driverRows}
        columns="driver"
      />

      {gapChartData.length > 0 && (
        <div className="card-luxe p-4">
          <h3 className="mb-3 text-sm font-semibold">중요도-현재 격차 (Top 영역)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[-2, 2]} />
                <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine x={0} stroke="#94a3b8" />
                <Bar dataKey="gap" name="중요도−현재" fill="#c9a227" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <AnalysisTable
        title="개선 우선 격차 Top 5"
        subtitle="중요도 대비 현재가 낮은 드라이버"
        rows={driverGapRows}
      />

      {ipaChartData.length >= 2 && <IpaQuadrantChart data={ipaChartData} />}

      {driverImportance && !driverImportance.insufficientData && (
        <NarrativeBlock
          label="IPA 회귀 요약"
          text={`Y=SE · 9개 드라이버 β회귀 · R²=${driverImportance.rSquared?.toFixed(2) ?? "—"} · N=${driverImportance.n} · FOCUS=${driverImportance.entries.filter((e) => e.priority === "FOCUS").map((e) => DRIVER_LABELS[e.code] ?? e.code).join(", ") || "없음"}`}
        />
      )}

      {teamLevelDriverImportance && !teamLevelDriverImportance.insufficientData && (
        <AnalysisTable
          title="HLM-lite 팀 수준 드라이버"
          subtitle="팀간 SE 차이 설명력"
          rows={buildDriverAnalysisRows(
            Object.fromEntries(
              teamLevelDriverImportance.entries.map((e) => [
                e.code,
                { current: e.current ?? null, importance: null },
              ]),
            ),
            teamLevelDriverImportance,
          )}
          columns="driver"
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {lpaSlot}
        {iccSlot}
      </div>

      {openTextSlot}
    </>
  );
}

export function pickItemRows(
  codes: Array<{ code: string; label: string; note?: string }>,
  averages?: Record<string, number | null>,
) {
  if (!averages) return [];
  return buildItemAnalysisRows(
    codes
      .filter((c) => averages[c.code] != null)
      .map((c) => ({ ...c, score: averages[c.code] ?? null })),
  );
}

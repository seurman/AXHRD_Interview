"use client";

import { useCallback, useEffect, useState } from "react";
import { DiagnosticLongitudinalPanel } from "@/components/diagnostic/DiagnosticLongitudinalPanel";
import type { ResolvedReportConfig } from "@/lib/diagnostic/report-profile";
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
} from "recharts";

type Props = { waveId: string };

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
  teams?: Array<{ teamId: string; teamName: string; hidden: boolean }>;
  gapMatrix?: {
    mode: string;
    note?: string;
    xBase?: number | null;
    yBase?: number | null;
    teams?: Array<{ teamId: string; teamName: string; ORI: number | null; OVI: number | null; quadrant: string | null }>;
  };
};

type WaveMeta = {
  id: string;
  label: string | null;
  waveNumber: number;
  sectionBadge?: string;
  orgWideLink?: string;
  enabledSectionCodes: string[] | null;
  reportConfig?: ResolvedReportConfig | null;
  teams: Array<{ id: string; name: string }>;
};

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

  if (loading) return <p className="text-sm text-muted">집계 중…</p>;
  if (!wave) return <p className="text-sm text-muted">웨이브를 찾을 수 없습니다.</p>;

  const reportConfig = wave.reportConfig ?? null;
  const enabled = reportConfig?.activeSectionCodes ?? wave.enabledSectionCodes;
  const isEnabled = (code: string) => sectionEnabled(code, reportConfig, wave.enabledSectionCodes);
  const showTeamsTab = !reportConfig || isTabEnabledInReport("teams", reportConfig);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-muted">
            Wave {wave.waveNumber}
            {wave.label ? ` · ${wave.label}` : ""}
            {wave.sectionBadge ? ` · ${wave.sectionBadge}` : ""}
          </p>
        </div>
        {wave.orgWideLink && (
          <button
            type="button"
            className="text-xs text-accent hover:underline"
            onClick={() => void navigator.clipboard.writeText(wave.orgWideLink!)}
          >
            조직 전체 링크 복사
          </button>
        )}
      </div>

      <DiagnosticLongitudinalPanel waveId={waveId} apiBase="org" />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`nav-pill ${tab === "overview" ? "nav-pill-active" : ""}`}
          onClick={() => setTab("overview")}
        >
          종합
        </button>
        {showTeamsTab && (
          <button
            type="button"
            className={`nav-pill ${tab === "teams" ? "nav-pill-active" : ""}`}
            onClick={() => setTab("teams")}
          >
            팀
          </button>
        )}
      </div>

      {tab === "overview" && (
        <>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="all">전사 종합</option>
              {wave.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {activeScores?.hidden ? (
            <div className="card-luxe p-6 text-center text-sm text-muted">
              표본 부족 (N={activeScores.sampleSize ?? 0}, 최소 {activeScores.minGroupSize ?? 5}명 필요)
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {isEnabled("OHI") && (
                  <MetricCard label="OHI" value={activeScores?.scores?.ohi.overall} band={activeScores?.scores?.ohi.band} />
                )}
                {isEnabled("ORI") && (
                  <MetricCard label="ORI" value={activeScores?.scores?.ori.ORI} band={activeScores?.scores?.ori.band} />
                )}
                {isEnabled("OVI") && (
                  <MetricCard label="OVI" value={activeScores?.scores?.ovi.OVI} band={activeScores?.scores?.ovi.band} />
                )}
                {isEnabled("OAI") && (
                  <MetricCard label="OAI" value={activeScores?.scores?.oai.OAI} band={activeScores?.scores?.oai.band} />
                )}
              </div>

              {radarData.length > 0 && (
                <div className="card-luxe p-4">
                  <h3 className="mb-2 text-sm font-semibold">4축 레이더</h3>
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

              {driverEntries.length > 0 && (
                <div className="card-luxe p-4">
                  <h3 className="mb-2 text-sm font-semibold">드라이버 영역 — 현재 vs 중요도</h3>
                  <div className="h-72">
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
              )}

              <div className="grid gap-4 md:grid-cols-2">
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
          {aggregate?.gapMatrix?.mode === "OLS_REQUIRED" && (
            <div className="card-luxe p-4 text-sm text-muted">
              {aggregate.gapMatrix.note}
            </div>
          )}
          {aggregate?.gapMatrix?.mode === "GAP_MATRIX" && aggregate.gapMatrix.teams && (
            <div className="card-luxe p-4">
              <h3 className="mb-2 text-sm font-semibold">팀 Gap 매트릭스 (ORI vs OVI)</h3>
              <div className="h-80">
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
          <ul className="space-y-2">
            {(aggregate?.teams ?? []).map((t) => (
              <li key={t.teamId} className="card-luxe flex items-center justify-between p-4 text-sm">
                <span className="font-medium text-foreground">{t.teamName}</span>
                {t.hidden ? (
                  <span className="text-muted">표본 부족</span>
                ) : (
                  <span className="text-muted">집계 가능</span>
                )}
              </li>
            ))}
          </ul>
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

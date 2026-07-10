"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type Tab = "basic" | "detail" | "teams";

type Scores = {
  hidden: boolean;
  reason?: string;
  sampleSize?: number;
  minGroupSize?: number;
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
  teams?: Array<{ teamId: string; teamName: string; hidden: boolean }>;
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
  teams: Array<{ id: string; name: string }>;
};

function isSectionEnabled(code: string, enabled: string[] | null): boolean {
  if (!enabled?.length) return true;
  return enabled.includes(code);
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
        teams: w.teams.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })),
      });
      const enabled = w.enabledSectionCodes as string[] | null;
      const first =
        ["OHI", "ORI", "OVI", "OAI"].find((c) => isSectionEnabled(c, enabled)) ?? "OHI";
      setDetailSection(first);
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
    if (tab !== "teams" || !wave) return;
    for (const t of wave.teams) {
      const row = aggregate?.teams?.find((r) => r.teamId === t.id);
      if (row && !row.hidden) void loadTeamScore(t.id);
    }
  }, [tab, wave, aggregate?.teams, teamScores, waveId]);

  const enabled = wave?.enabledSectionCodes ?? null;
  const collectionRate =
    wave?.memberCount && wave.memberCount > 0
      ? Math.round((wave.responseCount / wave.memberCount) * 100)
      : null;

  const radarData = useMemo(() => {
    if (!aggregate?.scores || aggregate.hidden) return [];
    const s = aggregate.scores;
    const axes: { axis: string; value: number }[] = [];
    if (isSectionEnabled("OHI", enabled) && s.ohi.overall != null)
      axes.push({ axis: "OHI", value: s.ohi.overall });
    if (isSectionEnabled("ORI", enabled) && s.ori.ORI != null)
      axes.push({ axis: "ORI", value: s.ori.ORI });
    if (isSectionEnabled("OVI", enabled) && s.ovi.OVI != null)
      axes.push({ axis: "OVI", value: s.ovi.OVI });
    if (isSectionEnabled("OAI", enabled) && s.oai.OAI != null)
      axes.push({ axis: "OAI", value: s.oai.OAI });
    return axes;
  }, [aggregate, enabled]);

  const driverEntries =
    aggregate?.scores && !aggregate.hidden && isSectionEnabled("OHI", enabled)
      ? Object.entries(aggregate.scores.ohi.drivers).map(([code, d]) => ({
          code,
          current: d.current ?? 0,
          importance: d.importance ?? 0,
        }))
      : [];

  const insights =
    aggregate?.scores && !aggregate.hidden && isSectionEnabled("OHI", enabled)
      ? driverInsights(aggregate.scores.ohi.drivers)
      : null;

  const visibleTeams = (aggregate?.teams ?? []).filter((t) => !t.hidden);
  const teamBarData = visibleTeams.map((t) => {
    const sc = teamScores[t.teamId]?.scores;
    return {
      name: t.teamName,
      OHI: sc?.ohi.overall ?? 0,
      ORI: sc?.ori.ORI ?? 0,
      OVI: sc?.ovi.OVI ?? 0,
      OAI: sc?.oai.OAI ?? 0,
    };
  });

  if (loading) return <p className="text-sm text-muted">집계 중…</p>;
  if (!wave) return <p className="text-sm text-muted">캠페인을 찾을 수 없습니다.</p>;

  const detailSections = ["OHI", "ORI", "OVI", "OAI"].filter((c) => isSectionEnabled(c, enabled));

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

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["basic", "기본"],
            ["detail", "상세"],
            ["teams", "팀별"],
          ] as const
        ).map(([key, label]) => (
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
                {isSectionEnabled("OHI", enabled) && (
                  <MetricCard label="OHI" value={aggregate?.scores?.ohi.overall} band={aggregate?.scores?.ohi.band} />
                )}
                {isSectionEnabled("ORI", enabled) && (
                  <MetricCard label="ORI" value={aggregate?.scores?.ori.ORI} band={aggregate?.scores?.ori.band} />
                )}
                {isSectionEnabled("OVI", enabled) && (
                  <MetricCard label="OVI" value={aggregate?.scores?.ovi.OVI} band={aggregate?.scores?.ovi.band} />
                )}
                {isSectionEnabled("OAI", enabled) && (
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
                {isSectionEnabled("OHI", enabled) && (
                  <InsightCard
                    title="Risk Index"
                    body={
                      aggregate?.scores?.ohi.riskIndex != null
                        ? `${Math.round(aggregate.scores.ohi.riskIndex * 100)}% — 번아웃·이탈 위험 신호`
                        : "—"
                    }
                  />
                )}
                {isSectionEnabled("ORI", enabled) && (
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
              {detailSection === "OHI" && isSectionEnabled("OHI", enabled) && (
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
                  <StatsEnginePlaceholder
                    title="IPA (β회귀 기반 중요도-성과 매트릭스)"
                    description="β회귀 기반 IPA는 통계분석 엔진 연결 후 활성화됩니다."
                  />
                </>
              )}

              {detailSection === "ORI" && isSectionEnabled("ORI", enabled) && (
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

              {detailSection === "OVI" && isSectionEnabled("OVI", enabled) && (
                <InsightCard
                  title="Dynamic Congruence Gap"
                  body={
                    aggregate?.scores?.ovi.dynamicCongruenceGap != null
                      ? `격차 ${aggregate.scores.ovi.dynamicCongruenceGap.toFixed(2)} (AV−HV)`
                      : "—"
                  }
                />
              )}

              {detailSection === "OAI" && isSectionEnabled("OAI", enabled) && (
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
                <StatsEnginePlaceholder title="LPA 구성원 유형" />
                <StatsEnginePlaceholder title="HLM / ICC (다준위 신뢰도)" />
              </div>
            </>
          )}
        </div>
      )}

      {tab === "teams" && (
        <div className="space-y-4">
          {wave.teams.length === 0 ? (
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
              {aggregate?.gapMatrix?.mode === "OLS_REQUIRED" && (
                <div className="card-luxe p-4 text-sm text-muted">
                  <span className="mr-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50">
                    OLS 회귀분석 엔진 연결 예정
                  </span>
                  {aggregate.gapMatrix.note}
                </div>
              )}

              {aggregate?.gapMatrix?.mode === "GAP_MATRIX" &&
                visibleTeams.length >= 5 &&
                aggregate.gapMatrix.teams && (
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

              {teamBarData.length >= 2 && (
                <div className="card-luxe p-4">
                  <h3 className="mb-2 text-sm font-semibold">팀 간 비교</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamBarData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[1, 5]} />
                        <Tooltip />
                        <Legend />
                        {isSectionEnabled("OHI", enabled) && <Bar dataKey="OHI" fill="#c9a227" />}
                        {isSectionEnabled("ORI", enabled) && <Bar dataKey="ORI" fill="#64748b" />}
                        {isSectionEnabled("OVI", enabled) && <Bar dataKey="OVI" fill="#94a3b8" />}
                        {isSectionEnabled("OAI", enabled) && <Bar dataKey="OAI" fill="#475569" />}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <ul className="space-y-3">
                {(aggregate?.teams ?? []).map((t) => {
                  const sc = teamScores[t.teamId];
                  const teamInsights =
                    sc?.scores && !sc.hidden && isSectionEnabled("OHI", enabled)
                      ? driverInsights(sc.scores.ohi.drivers)
                      : null;
                  return (
                    <li
                      key={t.teamId}
                      className={`card-luxe p-4 ${t.hidden ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{t.teamName}</span>
                        {t.hidden ? (
                          <span className="text-xs text-muted">표본 부족 — 최소 5명 필요</span>
                        ) : (
                          <span className="text-xs text-muted">N={sc?.sampleSize ?? "—"}</span>
                        )}
                      </div>
                      {!t.hidden && sc?.scores && (
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          {teamInsights && (
                            <>
                              <p className="text-muted">
                                <span className="font-medium text-foreground">강점: </span>
                                {teamInsights.strengths.map((s) => s.code).join(", ") || "—"}
                              </p>
                              <p className="text-muted">
                                <span className="font-medium text-foreground">개선: </span>
                                {teamInsights.improvements.map((s) => s.code).join(", ") || "—"}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
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

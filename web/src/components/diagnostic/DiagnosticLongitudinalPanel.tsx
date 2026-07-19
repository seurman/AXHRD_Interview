"use client";

import { useEffect, useState } from "react";
import { formatScore, formatScoreDelta } from "@/lib/diagnostic/format-score";

type Delta = {
  axis: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
};

type GoldenProjection = {
  months: 3 | 6 | 12;
  projected: number | null;
  deltaFromNow: number | null;
};

type GoldenAxis = {
  axis: string;
  current: number | null;
  slopePerMonth: number | null;
  projections: GoldenProjection[];
};

type GoldenTime = {
  available: boolean;
  reason?: string;
  waveCount: number;
  monthsPerWave: number;
  axes: GoldenAxis[];
  caveat: string;
};

type Comparison = {
  available: boolean;
  reason?: string;
  currentWave: { waveNumber: number; label: string | null };
  previousWave: { waveNumber: number; label: string | null } | null;
  deltas: Delta[];
  goldenTime?: GoldenTime | null;
};

type Props = {
  waveId: string;
  apiBase: "admin" | "org";
};

export function DiagnosticLongitudinalPanel({ waveId, apiBase }: Props) {
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url =
      apiBase === "admin"
        ? `/api/admin/diagnostic/waves/${waveId}/longitudinal`
        : `/api/org/diagnosis/waves/${waveId}/longitudinal`;
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [waveId, apiBase]);

  if (loading) return null;

  const golden = data?.goldenTime;

  return (
    <div className="space-y-4">
      <div className="card-luxe p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">종단 비교 (Wave N vs N−1)</h3>
          {!data?.available && (
            <span className="text-xs text-muted">{data?.reason ?? "비교 불가"}</span>
          )}
        </div>

        {data?.available && data.previousWave && (
          <>
            <p className="mt-1 text-xs text-muted">
              Wave {data.previousWave.waveNumber}
              {data.previousWave.label ? ` (${data.previousWave.label})` : ""} → Wave{" "}
              {data.currentWave.waveNumber}
              {data.currentWave.label ? ` (${data.currentWave.label})` : ""}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {data.deltas.map((d) => (
                <div key={d.axis} className="rounded-lg border border-card-border px-3 py-2 text-sm">
                  <p className="text-xs text-muted">{d.axis}</p>
                  <p className="font-semibold text-foreground">
                    {formatScore(d.current)}
                    {d.delta != null && (
                      <span
                        className={`ml-2 text-xs font-normal ${
                          d.delta > 0
                            ? "text-emerald-600"
                            : d.delta < 0
                              ? "text-rose-600"
                              : "text-muted"
                        }`}
                      >
                        {formatScoreDelta(d.delta)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">이전: {formatScore(d.previous)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {golden ? (
        <div className="card-luxe p-4">
          <h3 className="text-sm font-semibold text-foreground">골든타임 추세 (3 / 6 / 12개월)</h3>
          <p className="mt-0.5 text-xs text-muted">
            Wave {golden.waveCount}회 · 간격 약 {golden.monthsPerWave}개월 · 단순 선형추세 투영
          </p>
          {!golden.available ? (
            <p className="mt-3 text-xs text-muted">{golden.reason ?? "투영 불가"}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 text-muted dark:border-white/10">
                    <th className="py-2 pr-3 font-medium">축</th>
                    <th className="py-2 pr-3 font-medium">현재</th>
                    <th className="py-2 pr-3 font-medium">+3개월</th>
                    <th className="py-2 pr-3 font-medium">+6개월</th>
                    <th className="py-2 font-medium">+12개월</th>
                  </tr>
                </thead>
                <tbody>
                  {golden.axes.map((a) => {
                    const byMonth = Object.fromEntries(
                      a.projections.map((p) => [p.months, p]),
                    ) as Record<number, GoldenProjection>;
                    return (
                      <tr key={a.axis} className="border-b border-black/5 dark:border-white/5">
                        <td className="py-2 pr-3 font-medium text-foreground">{a.axis}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatScore(a.current)}</td>
                        {[3, 6, 12].map((m) => (
                          <td key={m} className="py-2 pr-3 tabular-nums text-muted">
                            {formatScore(byMonth[m]?.projected ?? null)}
                            {byMonth[m]?.deltaFromNow != null ? (
                              <span className="ml-1 text-[10px]">
                                ({formatScoreDelta(byMonth[m].deltaFromNow)})
                              </span>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">{golden.caveat}</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

type Delta = {
  axis: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
};

type Comparison = {
  available: boolean;
  reason?: string;
  currentWave: { waveNumber: number; label: string | null };
  previousWave: { waveNumber: number; label: string | null } | null;
  deltas: Delta[];
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

  return (
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
                  {d.current != null ? d.current.toFixed(1) : "—"}
                  {d.delta != null && (
                    <span
                      className={`ml-2 text-xs font-normal ${
                        d.delta > 0 ? "text-emerald-600" : d.delta < 0 ? "text-rose-600" : "text-muted"
                      }`}
                    >
                      {d.delta > 0 ? "+" : ""}
                      {d.delta.toFixed(1)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  이전: {d.previous != null ? d.previous.toFixed(1) : "—"}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-3 text-xs text-muted">
        β/IPA/LPA/HLM 통계 추정은 Python 서비스 연결 후 제공됩니다. 위 수치는 결정론적 평균 점수
        차이만 표시합니다.
      </p>
    </div>
  );
}

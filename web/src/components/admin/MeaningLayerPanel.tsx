"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type MapsRow = {
  id: string;
  fromKey: string;
  fromLabel: string;
  toKey: string;
  toLabel: string;
  weight: number;
  note: string | null;
};

type Snapshot = {
  stats: { totalEdges: number; byEdgeType: Record<string, number> };
  ncsCompetencies: Array<{ id: string; code: string; nameKo: string }>;
  globalClusters: Array<{
    id: string;
    code: string;
    nameKo: string;
    competencies: Array<{ id: string; code: string; nameKo: string }>;
  }>;
  mapsTo: MapsRow[];
  edgeTypeLabels: Record<string, string>;
};

type Neighbor = {
  direction: "out" | "in";
  edgeType: string;
  edgeLabel: string;
  weight: number;
  note: string | null;
  otherKind: string;
  otherKey: string;
  otherLabel: string;
  relationId: string;
};

export function MeaningLayerPanel() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNcs, setSelectedNcs] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[] | null>(null);
  const [neighborLabel, setNeighborLabel] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/meaning");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "불러오기 실패");
      setData(json as Snapshot);
      if (!selectedNcs && json.ncsCompetencies?.[0]) {
        setSelectedNcs(json.ncsCompetencies[0].code);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedNcs) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/admin/meaning/node/${encodeURIComponent("NCS_COMPETENCY")}/${encodeURIComponent(selectedNcs)}`,
      );
      const json = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setNeighbors([]);
        setNeighborLabel(null);
        return;
      }
      setNeighborLabel(json.label ?? selectedNcs);
      setNeighbors(json.neighbors ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedNcs]);

  const mapsByNcs = useMemo(() => {
    if (!data) return new Map<string, MapsRow[]>();
    const m = new Map<string, MapsRow[]>();
    for (const row of data.mapsTo) {
      const list = m.get(row.fromKey) ?? [];
      list.push(row);
      m.set(row.fromKey, list);
    }
    return m;
  }, [data]);

  const rematerializeNote =
    "시드 재적용: 로컬/운영에서 `npm run db:seed:meaning` (맵핑 + 구조 엣지 동기화)";

  return (
    <section className="space-y-4 border-t border-card-border pt-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gold">Meaning Layer · L3</p>
        <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">온톨로지 · 개념 관계</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">
          AX 플랫폼 Meaning 층입니다. NCS(IRT)와 Global 20은 합치지 않고{" "}
          <code className="text-xs">MAPS_TO</code> 엣지로만 연결합니다. Postgres{" "}
          <code className="text-xs">ConceptRelation</code>이 시스템 오브 레코드이며, 그래프 DB는
          이후 선택적으로 붙입니다. 명세:{" "}
          <span className="text-foreground/80">docs/AX-PLATFORM-LAYERS.md</span>
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Meaning Layer 불러오는 중…
        </p>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-card-border bg-card px-4 py-3 text-sm">
              <span className="text-muted">활성 엣지</span>{" "}
              <strong className="text-foreground">{data.stats.totalEdges}</strong>
            </div>
            {Object.entries(data.stats.byEdgeType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div
                  key={type}
                  className="rounded-xl border border-card-border bg-card px-3 py-2 text-xs"
                >
                  <span className="text-muted">{data.edgeTypeLabels[type] ?? type}</span>{" "}
                  <span className="font-medium text-foreground">{count}</span>
                </div>
              ))}
            <button
              type="button"
              onClick={() => void load()}
              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-xs"
              title={rematerializeNote}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              새로고침
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">NCS 6</p>
              {data.ncsCompetencies.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedNcs(c.code)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedNcs === c.code
                      ? "bg-accent/15 font-medium text-accent"
                      : "text-foreground hover:bg-card"
                  }`}
                >
                  {c.nameKo}
                  <span className="mt-0.5 block text-[11px] text-muted">{c.code}</span>
                </button>
              ))}
            </aside>

            <div className="space-y-6">
              <div className="rounded-xl border border-card-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">
                  MAPS_TO — {neighborLabel ?? selectedNcs}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  면접 IRT 역량이 글로벌 사전의 어느 개념과 연결되는지 (가중치 = 관련도)
                </p>
                <ul className="mt-3 space-y-2">
                  {(mapsByNcs.get(selectedNcs ?? "") ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-card-border/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium text-foreground">{row.toLabel}</span>
                        <span className="ml-2 text-xs text-muted">{row.toKey}</span>
                        {row.note ? (
                          <p className="mt-0.5 text-xs text-muted">{row.note}</p>
                        ) : null}
                      </div>
                      <span className="tabular-nums text-xs text-accent">w={row.weight.toFixed(2)}</span>
                    </li>
                  ))}
                  {(mapsByNcs.get(selectedNcs ?? "") ?? []).length === 0 ? (
                    <li className="text-sm text-muted">
                      매핑이 없습니다. {rematerializeNote}
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-xl border border-card-border bg-card p-4">
                <h3 className="text-sm font-semibold text-foreground">이웃 노드 (1-hop)</h3>
                <p className="mt-1 text-xs text-muted">선택 NCS 노드에서의 모든 활성 엣지</p>
                <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto text-sm">
                  {(neighbors ?? []).map((n) => (
                    <li
                      key={`${n.relationId}-${n.direction}-${n.otherKey}`}
                      className="flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background"
                    >
                      <span className="w-8 text-[10px] uppercase text-muted">
                        {n.direction === "out" ? "→" : "←"}
                      </span>
                      <span className="rounded bg-background px-1.5 py-0.5 text-[10px] text-muted">
                        {n.edgeLabel}
                      </span>
                      <span className="font-medium text-foreground">{n.otherLabel}</span>
                      <span className="text-[11px] text-muted">
                        {n.otherKind}:{n.otherKey}
                      </span>
                    </li>
                  ))}
                  {neighbors && neighbors.length === 0 ? (
                    <li className="text-muted">이웃 엣지 없음</li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-xl border border-dashed border-card-border p-4">
                <h3 className="text-sm font-semibold text-foreground">글로벌 사전 구조 (참고)</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.globalClusters.map((cl) => (
                    <div key={cl.code} className="text-xs">
                      <p className="font-medium text-foreground">{cl.nameKo}</p>
                      <ul className="mt-1 space-y-0.5 text-muted">
                        {cl.competencies.map((c) => (
                          <li key={c.code}>{c.nameKo}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

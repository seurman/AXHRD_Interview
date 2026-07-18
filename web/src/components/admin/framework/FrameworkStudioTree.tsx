"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";
import type { CompetencyLifecycleStatus } from "@prisma/client";
import { LIFECYCLE_LABEL } from "@/lib/repository/types";

type LifecycleFilter = "ALL" | CompetencyLifecycleStatus;

type Props = {
  clusters: BankCluster[];
  competencies: BankCompetencyRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  lifecycleFilter: LifecycleFilter;
  onLifecycleFilterChange: (filter: LifecycleFilter) => void;
  onCreateCompetency?: () => void;
};

const SOURCE_LABEL: Record<string, string> = {
  NCS: "NCS",
  GLOBAL: "Global",
  CUSTOM: "Custom",
};

function lifecycleTone(status: CompetencyLifecycleStatus): string {
  if (status === "ACTIVE") return "bg-emerald-500/15 text-emerald-700";
  if (status === "ARCHIVED") return "bg-zinc-500/15 text-zinc-600";
  return "bg-amber-500/15 text-amber-800";
}

export function FrameworkStudioTree({
  clusters,
  competencies,
  selectedId,
  onSelect,
  lifecycleFilter,
  onLifecycleFilterChange,
  onCreateCompetency,
}: Props) {
  const [query, setQuery] = useState("");
  const [openClusters, setOpenClusters] = useState<Set<string>>(() => new Set(clusters.map((c) => c.id)));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return competencies.filter((c) => {
      if (lifecycleFilter !== "ALL" && c.lifecycleStatus !== lifecycleFilter) return false;
      if (!q) return true;
      return (
        c.code.toLowerCase().includes(q) ||
        c.nameKo.toLowerCase().includes(q) ||
        (c.clusterNameKo ?? "").toLowerCase().includes(q)
      );
    });
  }, [competencies, lifecycleFilter, query]);

  const byCluster = useMemo(() => {
    const unclustered: BankCompetencyRow[] = [];
    const map = new Map<string, BankCompetencyRow[]>();
    for (const cl of clusters) map.set(cl.id, []);
    for (const c of filtered) {
      if (c.clusterId && map.has(c.clusterId)) {
        map.get(c.clusterId)!.push(c);
      } else {
        unclustered.push(c);
      }
    }
    return { map, unclustered };
  }, [clusters, filtered]);

  function toggleCluster(id: string) {
    setOpenClusters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="flex h-full min-h-[min(28rem,70dvh)] flex-col rounded-2xl border border-card-border bg-card shadow-sm lg:min-h-[640px]">
      <div className="border-b border-card-border p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-foreground">역량 프레임워크</h2>
          {onCreateCompetency && (
            <button
              type="button"
              onClick={onCreateCompetency}
              className="min-h-10 min-w-10 rounded-lg p-2 text-accent hover:bg-accent/10"
              title="역량 추가"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="코드·역량명 검색"
            className="input-luxe w-full py-2.5 pl-8 pr-3 text-base sm:text-sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(
            [
              ["ALL", "전체"],
              ["ACTIVE", "활성"],
              ["DRAFT", "개발"],
              ["ARCHIVED", "숨김"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onLifecycleFilterChange(key)}
              className={`min-h-9 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                lifecycleFilter === key ? "bg-accent/15 text-accent" : "text-muted hover:bg-muted/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted">조건에 맞는 역량이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {clusters.map((cl) => {
              const items = byCluster.map.get(cl.id) ?? [];
              if (items.length === 0) return null;
              const open = openClusters.has(cl.id);
              return (
                <li key={cl.id}>
                  <button
                    type="button"
                    onClick={() => toggleCluster(cl.id)}
                    className="flex min-h-11 w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-xs font-semibold text-muted hover:bg-muted/20"
                  >
                    {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <span className="min-w-0 flex-1 truncate text-foreground">{cl.nameKo}</span>
                    <span className="shrink-0 tabular-nums">{items.length}</span>
                  </button>
                  {open && (
                    <ul className="ml-2 space-y-0.5 border-l border-card-border/60 pl-2">
                      {items.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => onSelect(c.id)}
                            className={`min-h-14 w-full rounded-lg px-2 py-2.5 text-left transition ${
                              selectedId === c.id
                                ? "bg-accent/10 ring-1 ring-accent/30"
                                : "hover:bg-muted/20"
                            }`}
                          >
                            <p className="truncate text-sm font-medium text-foreground">{c.nameKo}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                              <span className="font-mono">{c.code}</span>
                              <span>·</span>
                              <span>{SOURCE_LABEL[c.source] ?? c.source}</span>
                              <span>·</span>
                              <span>{c.questionCount}문항</span>
                            </p>
                            <span
                              className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${lifecycleTone(c.lifecycleStatus)}`}
                            >
                              {LIFECYCLE_LABEL[c.lifecycleStatus]}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {byCluster.unclustered.length > 0 && (
              <li className="pt-2">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  클러스터 없음
                </p>
                <ul className="space-y-0.5">
                  {byCluster.unclustered.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className={`w-full rounded-lg px-2 py-2 text-left ${
                          selectedId === c.id ? "bg-accent/10 ring-1 ring-accent/30" : "hover:bg-muted/20"
                        }`}
                      >
                        <p className="truncate text-sm font-medium">{c.nameKo}</p>
                        <p className="font-mono text-[10px] text-muted">{c.code}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        )}
      </div>
    </aside>
  );
}

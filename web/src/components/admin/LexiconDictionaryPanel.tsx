"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, Loader2, RefreshCw } from "lucide-react";

type RubricByLevel = Record<string, string[]>;
type Term = {
  id: string;
  kind: string;
  termKo: string;
  meaningKo: string;
  goodExample: string;
  badExample: string;
  preferredBy: string[];
};
type LexEntry = {
  nameKo: string;
  nameEn?: string;
  clusterCode: string;
  ncsAnchor: string;
  definition: string;
  rubricByLevel: RubricByLevel;
  terms: Term[];
  lensSignals: Record<string, string[]>;
};
type ClusterMeta = {
  code: string;
  nameKo: string;
  nameEn?: string;
  description?: string;
  sortOrder?: number;
};
type LexDoc = {
  version: number;
  description: string;
  sources: string[];
  clusters: ClusterMeta[];
  competencies: Record<string, LexEntry>;
};

type Props = {
  embedded?: boolean;
  onSynced?: () => void;
};

export function LexiconDictionaryPanel({ embedded = false, onSynced }: Props) {
  const [doc, setDoc] = useState<LexDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/competency-lexicon");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "불러오기 실패");
      setDoc(data);
      const first = data.clusters?.[0]?.code ?? null;
      setOpenCluster((prev) => prev ?? first);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const byCluster = useMemo(() => {
    if (!doc) return [];
    const clusters = [...(doc.clusters ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    return clusters.map((cl) => ({
      ...cl,
      items: Object.entries(doc.competencies)
        .filter(([, e]) => e.clusterCode === cl.code)
        .map(([code, e]) => ({ code, ...e })),
    }));
  }, [doc]);

  const selected = useMemo(() => {
    if (!doc || !selectedCode) return null;
    const entry = doc.competencies[selectedCode];
    if (!entry) return null;
    return { code: selectedCode, ...entry };
  }, [doc, selectedCode]);

  async function syncToBank() {
    if (
      !confirm(
        "역량사전(정의·L1–L5 루브릭·신호어)을 Framework Studio 통합 뱅크에 반영할까요?\n\n기존 6역량 정의/루브릭도 사전 기준으로 갱신됩니다.",
      )
    ) {
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/competency-lexicon/sync-to-bank", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "동기화 실패");
      setMessage(
        `동기화 완료 — 역량 ${data.competencies ?? 0}개 · RubricSet ${data.rubricSets ?? 0}개 · 문항 ${data.questions ?? 0}개 (코어 ${data.coreUpdated ?? 0})`,
      );
      onSynced?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "동기화 실패");
    } finally {
      setSyncing(false);
    }
  }

  const shell = embedded ? "space-y-4" : "card-luxe space-y-4 p-5";

  if (loading) {
    return (
      <div className={`${shell} flex items-center gap-2 text-sm text-muted`}>
        <Loader2 className="h-4 w-4 animate-spin" /> 역량사전 불러오는 중…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className={shell}>
        <p className="text-sm text-rose-600">{error ?? "데이터 없음"}</p>
        <button type="button" className="btn-secondary text-sm" onClick={() => void load()}>
          다시 시도
        </button>
      </div>
    );
  }

  const total = Object.keys(doc.competencies).length;

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Competency Lexicon
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-base font-bold text-foreground">
            <BookOpen className="h-4 w-4 text-gold" />
            역량사전 · v{doc.version}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted">{doc.description}</p>
          <p className="mt-1 text-xs text-muted">
            클러스터 {doc.clusters.length} · 역량 {total} · 정의·루브릭·신호어 포함
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary inline-flex min-h-11 items-center gap-1.5 text-sm"
            onClick={() => void load()}
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
          <button
            type="button"
            className="btn-primary inline-flex min-h-11 items-center gap-1.5 text-sm"
            disabled={syncing}
            onClick={() => void syncToBank()}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Framework Studio에 반영
          </button>
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">{message}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)]">
        <div className="space-y-2">
          {byCluster.map((cl) => {
            const open = openCluster === cl.code;
            return (
              <div key={cl.code} className="rounded-xl border border-card-border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                  onClick={() => setOpenCluster(open ? null : cl.code)}
                >
                  <span>
                    <span className="text-sm font-semibold text-foreground">{cl.nameKo}</span>
                    <span className="ml-2 text-[11px] text-muted">{cl.items.length}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <ul className="space-y-1 border-t border-card-border px-2 py-2">
                    {cl.items.map((item) => (
                      <li key={item.code}>
                        <button
                          type="button"
                          className={`w-full rounded-lg px-2.5 py-2 text-left text-xs ${
                            selectedCode === item.code
                              ? "bg-accent/15 font-semibold text-foreground"
                              : "text-muted hover:bg-muted/10 hover:text-foreground"
                          }`}
                          onClick={() => setSelectedCode(item.code)}
                        >
                          {item.nameKo}
                          <span className="ml-1 text-[10px] opacity-70">({item.code})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-card-border p-4">
          {!selected ? (
            <p className="text-sm text-muted">왼쪽에서 역량을 선택하면 정의·루브릭·신호어를 봅니다.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold text-gold">{selected.code}</p>
                <h4 className="text-lg font-bold text-foreground">
                  {selected.nameKo}
                  {selected.nameEn ? (
                    <span className="ml-2 text-sm font-normal text-muted">{selected.nameEn}</span>
                  ) : null}
                </h4>
                <p className="mt-1 text-xs text-muted">{selected.ncsAnchor}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  {selected.definition}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  L1–L5 루브릭
                </p>
                <div className="space-y-2">
                  {["1", "2", "3", "4", "5"].map((lv) => (
                    <div key={lv} className="rounded-lg bg-primary/[0.03] px-3 py-2">
                      <p className="text-[11px] font-bold text-accent">Level {lv}</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-foreground/85">
                        {(selected.rubricByLevel[lv] ?? []).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
                  신호어 · 숙어
                </p>
                <ul className="flex flex-wrap gap-2">
                  {selected.terms.map((t) => (
                    <li
                      key={t.id}
                      title={`${t.meaningKo}\n예: ${t.goodExample}`}
                      className="rounded-lg border border-card-border px-2.5 py-1 text-xs"
                    >
                      <span className="text-gold">{t.kind === "phrase" ? "숙어" : "단어"}</span>
                      <span className="mx-1 text-muted">·</span>
                      {t.termKo}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      <details className="rounded-lg border border-card-border px-3 py-2 text-xs text-muted">
        <summary className="cursor-pointer font-semibold text-foreground">출처</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {doc.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

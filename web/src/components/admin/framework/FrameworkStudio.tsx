"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import type { CompetencyLifecycleStatus } from "@prisma/client";
import type { BankCluster, BankCompetencyRow } from "@/lib/competency/content-bank-data";
import { FrameworkStudioTree } from "@/components/admin/framework/FrameworkStudioTree";
import {
  FrameworkCompetencyWorkspace,
  type FrameworkWorkspaceTab,
} from "@/components/admin/framework/FrameworkCompetencyWorkspace";
import type { CatalogCluster } from "@/components/admin/kit-studio/types";
import { competencyLabel } from "@/lib/labels";

type LifecycleFilter = "ALL" | CompetencyLifecycleStatus;

type Props = {
  initialClusters: BankCluster[];
  initialCompetencies: BankCompetencyRow[];
  initialQuestions: Awaited<ReturnType<typeof import("@/lib/competency/content-bank-data").loadContentBankSnapshot>>["questions"];
  initialCompetencyCode?: string | null;
  initialTab?: FrameworkWorkspaceTab | null;
};

export function FrameworkStudio({
  initialClusters,
  initialCompetencies,
  initialQuestions,
  initialCompetencyCode,
  initialTab,
}: Props) {
  const [clusters, setClusters] = useState(initialClusters);
  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState(() => {
    if (initialCompetencyCode) {
      const hit = initialCompetencies.find((c) => c.code === initialCompetencyCode);
      if (hit) return hit.id;
    }
    return initialCompetencies[0]?.id ?? "";
  });
  const [workspaceTab, setWorkspaceTab] = useState<FrameworkWorkspaceTab>(
    initialTab === "quality" ? "quality" : "meta",
  );
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("ALL");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showNewComp, setShowNewComp] = useState(false);
  const [catalog, setCatalog] = useState<CatalogCluster[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newComp, setNewComp] = useState({ code: "", nameKo: "", description: "" });

  const selected = useMemo(
    () => competencies.find((c) => c.id === selectedId) ?? null,
    [competencies, selectedId],
  );

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/content-bank");
    if (!res.ok) throw new Error("새로고침 실패");
    const data = await res.json();
    setCompetencies(data.competencies);
    setQuestions(data.questions);
    if (data.clusters) setClusters(data.clusters);
    if (!data.competencies.some((c: BankCompetencyRow) => c.id === selectedId)) {
      setSelectedId(data.competencies[0]?.id ?? "");
    }
  }, [selectedId]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch("/api/admin/content/catalog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "카탈로그 로드 실패");
      setCatalog(data.clusters ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "카탈로그 로드 실패");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showCatalog && catalog.length === 0) void loadCatalog();
  }, [showCatalog, catalog.length, loadCatalog]);

  async function createCompetency() {
    const code = newComp.code.trim().toUpperCase();
    const nameKo = newComp.nameKo.trim();
    if (!code || !nameKo) {
      setMessage("역량 코드와 한글명을 입력해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/competencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          nameKo,
          description: newComp.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성 실패");
      await refresh();
      setSelectedId(data.competency.id);
      setNewComp({ code: "", nameKo: "", description: "" });
      setShowNewComp(false);
      setMessage(`역량 ${code}을(를) DRAFT로 추가했습니다.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function importFromCatalog(source: "ncs" | "global", code: string) {
    if (competencies.some((c) => c.code === code)) {
      setMessage(`역량 ${code}은(는) 이미 뱅크에 있습니다.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/competencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromCatalog: true, selections: [{ source, code }] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "가져오기 실패");
      await refresh();
      setMessage(`카탈로그에서 ${code} 역량을 가져왔습니다.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setBusy(false);
    }
  }

  function competencyOptionLabel(c: { code: string; nameKo?: string | null }): string {
    const ko = c.nameKo?.trim() || competencyLabel(c.code);
    return ko === c.code ? c.code : `${ko} (${c.code})`;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/8 via-card to-gold/5 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">Framework Studio</p>
        <h2 className="mt-1 text-lg font-bold text-foreground">통합 역량 · IRT 문항 메타데이터</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          역량군 → 역량 → 문항 · 루브릭 · 품질을 한 워크스페이스에서 관리합니다. 기존 역량 뱅크(Repository) 기능은
          품질 탭에 통합되었습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          onClick={() => setShowCatalog((v) => !v)}
        >
          <Upload className="h-4 w-4" />
          카탈로그 가져오기
        </button>
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-1.5 text-sm"
          onClick={() => setShowNewComp((v) => !v)}
        >
          <Plus className="h-4 w-4" />
          역량 추가
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">{message}</p>
      )}

      {showNewComp && (
        <div className="card-luxe grid gap-3 p-4 sm:grid-cols-4">
          <input
            className="input-luxe"
            placeholder="코드 (예: COMMUNICATION)"
            value={newComp.code}
            onChange={(e) => setNewComp({ ...newComp, code: e.target.value.toUpperCase() })}
          />
          <input
            className="input-luxe"
            placeholder="한글명"
            value={newComp.nameKo}
            onChange={(e) => setNewComp({ ...newComp, nameKo: e.target.value })}
          />
          <input
            className="input-luxe sm:col-span-2"
            placeholder="설명 (선택)"
            value={newComp.description}
            onChange={(e) => setNewComp({ ...newComp, description: e.target.value })}
          />
          <button
            type="button"
            className="btn-primary sm:col-span-4"
            disabled={busy}
            onClick={() => void createCompetency()}
          >
            {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "DRAFT로 생성"}
          </button>
        </div>
      )}

      {showCatalog && (
        <div className="card-luxe max-h-48 space-y-2 overflow-y-auto p-4">
          <p className="text-sm font-medium">NCS · Global 카탈로그</p>
          {catalogLoading ? (
            <p className="text-sm text-muted">로딩…</p>
          ) : (
            catalog.map((cl) => (
              <div key={cl.code}>
                <p className="text-xs font-semibold text-muted">{cl.nameKo}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {cl.competencies.map((c) => {
                    const inBank = competencies.some((x) => x.code === c.code);
                    return (
                      <button
                        key={`${c.source}-${c.code}`}
                        type="button"
                        disabled={inBank || busy}
                        className="rounded border border-card-border px-2 py-0.5 text-[11px] disabled:opacity-40"
                        onClick={() => void importFromCatalog(c.source, c.code)}
                      >
                        {competencyOptionLabel(c)}
                        {inBank ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="grid min-h-[680px] gap-5 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
        <FrameworkStudioTree
          clusters={clusters}
          competencies={competencies}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          lifecycleFilter={lifecycleFilter}
          onLifecycleFilterChange={setLifecycleFilter}
          onCreateCompetency={() => setShowNewComp(true)}
        />
        <div className="min-w-0">
          {selected ? (
            <FrameworkCompetencyWorkspace
              competency={selected}
              clusters={clusters}
              competencies={competencies}
              questions={questions}
              tab={workspaceTab}
              onTabChange={setWorkspaceTab}
              onCompetencyUpdated={(id, patch) => {
                setCompetencies((prev) =>
                  prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
                );
              }}
              onDataRefresh={refresh}
            />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-card-border bg-muted/10 px-6 text-center">
              <p className="text-base font-medium text-foreground">역량을 선택하세요</p>
              <p className="mt-2 max-w-sm text-sm text-muted">
                좌측 트리에서 역량군을 펼치고 역량을 고르면 개요·문항·루브릭·품질을 편집할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

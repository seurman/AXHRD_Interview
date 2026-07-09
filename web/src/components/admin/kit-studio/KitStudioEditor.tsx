"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import {
  CompetencyRubricPanel,
  mapCompetencyRubrics,
  type RubricCompetency,
} from "@/components/admin/CompetencyRubricPanel";
import type { RubricByLevel } from "@/lib/competency/rubric";
import { buildOptimisticFromCatalog } from "./build-optimistic";
import type { KitStudioConfig } from "./create-kit-config";
import type {
  CatalogCluster,
  CatalogComp,
  CatalogQuestion,
  KitCompetency,
  KitQuestion,
} from "./types";

type Step = "kit" | "questions" | "rubrics";

const LEVELS = [1, 2, 3, 4, 5] as const;
const DND_TYPE = "application/x-axhrd-demo-comp";

export type KitStudioEditorProps<TQ extends KitQuestion = KitQuestion> = {
  config: KitStudioConfig;
  resetKey?: string;
  initialCompetencies: KitCompetency[];
  initialQuestions: TQ[];
  headerActions?: ReactNode;
  onRefreshData?: (data: Record<string, unknown>) => void;
  onEditQuestionAdvanced?: (q: TQ) => void;
  buildOptimisticQuestionExtra?: (q: CatalogQuestion, index: number) => Partial<TQ>;
  buildNewQuestionExtra?: () => Partial<TQ>;
  refreshNonce?: number;
  onKitStateChange?: (state: { competencyCount: number }) => void;
};

export function KitStudioEditor<TQ extends KitQuestion = KitQuestion>({
  config,
  resetKey,
  initialCompetencies,
  initialQuestions,
  headerActions,
  onRefreshData,
  onEditQuestionAdvanced,
  buildOptimisticQuestionExtra,
  buildNewQuestionExtra,
  refreshNonce,
  onKitStateChange,
}: KitStudioEditorProps<TQ>) {
  const { mode, catalogUrl, apiBase, refreshUrl, labels, showCompetencyActiveToggle } = config;
  const [step, setStep] = useState<Step>("kit");
  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedCompId, setSelectedCompId] = useState(initialCompetencies[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [addingCodes, setAddingCodes] = useState<Set<string>>(() => new Set());
  const [catalog, setCatalog] = useState<CatalogCluster[]>([]);
  const [catalogTotals, setCatalogTotals] = useState({ ncs: 0, global: 0 });
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set(["NCS_IRT"]));
  const [filter, setFilter] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [openLevels, setOpenLevels] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5]));

  const selectedComp = competencies.find((c) => c.id === selectedCompId);
  const kitCodes = useMemo(() => new Set(competencies.map((c) => c.code)), [competencies]);

  const questionsByLevel = useMemo(() => {
    const map = new Map<number, TQ[]>();
    for (const lv of LEVELS) map.set(lv, []);
    for (const q of questions) {
      if (q.competencyId !== selectedCompId) continue;
      map.get(q.level)?.push(q);
    }
    for (const lv of LEVELS) {
      map.get(lv)?.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [questions, selectedCompId]);

  const rubricCompetencies: RubricCompetency[] = useMemo(
    () => mapCompetencyRubrics(competencies),
    [competencies],
  );

  const refresh = useCallback(async () => {
    const res = await fetch(refreshUrl);
    if (!res.ok) throw new Error("새로고침 실패");
    const data = await res.json();
    setCompetencies(data.competencies);
    setQuestions(data.questions);
    onRefreshData?.(data);
    if (!data.competencies.some((c: KitCompetency) => c.id === selectedCompId)) {
      setSelectedCompId(data.competencies[0]?.id ?? "");
    }
  }, [refreshUrl, selectedCompId, onRefreshData]);

  useEffect(() => {
    setStep("kit");
    setCompetencies(initialCompetencies);
    setQuestions(initialQuestions);
    setSelectedCompId(initialCompetencies[0]?.id ?? "");
    setMessage(null);
    setAddingCodes(new Set());
  }, [resetKey, initialCompetencies, initialQuestions]);

  useEffect(() => {
    if (refreshNonce) void refresh();
  }, [refreshNonce, refresh]);

  useEffect(() => {
    onKitStateChange?.({ competencyCount: competencies.length });
  }, [competencies.length, onKitStateChange]);

  const findCatalogComp = useCallback(
    (source: "ncs" | "global", code: string): CatalogComp | null => {
      for (const cl of catalog) {
        const found = cl.competencies.find((c) => c.source === source && c.code === code);
        if (found) return found;
      }
      return null;
    },
    [catalog],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch(catalogUrl);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "카탈로그 로드 실패");
        if (cancelled) return;
        setCatalog(data.clusters ?? []);
        setCatalogTotals(data.totals ?? { ncs: 0, global: 0 });
        const globalOpen = (data.clusters as CatalogCluster[])
          .filter((c) => c.source === "global")
          .map((c) => c.code);
        setOpenClusters(new Set(["NCS_IRT", ...globalOpen.slice(0, 2)]));
      } catch (e) {
        if (!cancelled) setCatalogError(e instanceof Error ? e.message : "카탈로그 로드 실패");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogUrl]);

  const addFromCatalog = async (
    selections: Array<{ source: "ncs" | "global"; code: string }>,
  ) => {
    const fresh = selections.filter((s) => !kitCodes.has(s.code));
    if (fresh.length === 0) {
      setMessage(labels.alreadyInKitMessage);
      return;
    }
    setMessage(null);
    const codesBeingAdded = fresh.map((s) => s.code);
    setAddingCodes((prev) => new Set([...prev, ...codesBeingAdded]));

    const prevComps = competencies;
    const prevQs = questions;
    let sortBase = competencies.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;
    const optimisticComps: KitCompetency[] = [];
    const optimisticQs: TQ[] = [];

    for (const sel of fresh) {
      const item = findCatalogComp(sel.source, sel.code);
      if (!item) continue;
      const { comp, questions: qs } = buildOptimisticFromCatalog(
        item,
        sortBase++,
        buildOptimisticQuestionExtra,
      );
      optimisticComps.push(comp);
      optimisticQs.push(...(qs as TQ[]));
    }

    if (optimisticComps.length > 0) {
      setCompetencies((prev) => [...prev, ...optimisticComps]);
      setQuestions((prev) => [...prev, ...optimisticQs]);
      setSelectedCompId(optimisticComps[0].id);
    }

    try {
      const res = await fetch(`${apiBase}/competencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromCatalog: true, selections: fresh }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "추가 실패");

      const serverComps = (d.competencies as KitCompetency[] | undefined) ?? [];
      const serverQs = (d.questions as TQ[] | undefined) ?? [];
      if (serverComps.length > 0) {
        const codes = new Set(codesBeingAdded);
        setCompetencies((prevComps) => {
          const keptComps = prevComps.filter(
            (c) => !(codes.has(c.code) && c.id.startsWith("pending-")),
          );
          const merged = [...keptComps];
          for (const sc of serverComps) {
            const idx = merged.findIndex((c) => c.code === sc.code);
            if (idx >= 0) merged[idx] = sc;
            else merged.push(sc);
          }
          return merged.sort((a, b) => a.sortOrder - b.sortOrder);
        });
        setQuestions((prevQs) => {
          const keptQs = prevQs.filter(
            (q) => !(codes.has(q.competencyCode) && q.id.startsWith("pending-q-")),
          );
          const existingIds = new Set(keptQs.map((q) => q.id));
          const toAdd = serverQs.filter((q) => !existingIds.has(q.id));
          return [...keptQs, ...toAdd];
        });
        setSelectedCompId(serverComps[0].id);
      } else {
        await refresh();
      }

      const added = (d.added as string[]) ?? [];
      setMessage(labels.addedMessage(added.length, d.skipped));
    } catch (e) {
      setCompetencies(prevComps);
      setQuestions(prevQs);
      setMessage(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setAddingCodes((prev) => {
        const next = new Set(prev);
        for (const code of codesBeingAdded) next.delete(code);
        return next;
      });
    }
  };

  const parseDragPayload = (e: React.DragEvent): { source: "ncs" | "global"; code: string } | null => {
    const raw =
      e.dataTransfer.getData(DND_TYPE) ||
      e.dataTransfer.getData("text/plain") ||
      e.dataTransfer.getData("text");
    if (!raw) return null;
    try {
      const payload = JSON.parse(raw) as { source?: string; code?: string };
      if (!payload.code) return null;
      return {
        source: payload.source === "global" ? "global" : "ncs",
        code: String(payload.code).toUpperCase(),
      };
    } catch {
      return null;
    }
  };

  const onDragStart = (e: React.DragEvent, c: CatalogComp) => {
    const payload = JSON.stringify({ source: c.source, code: c.code });
    e.dataTransfer.setData(DND_TYPE, payload);
    // text/plain: Safari / 일부 브라우저가 커스텀 MIME만으로는 드래그가 깨짐
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "copy";
    setDraggingCode(c.code);
    // 질의/루브릭 화면에서도 드롭 가능하도록 키트 스텝으로 유도하지 않음 — 우측 전역 드롭존 사용
  };

  const onDragEnd = () => {
    setDraggingCode(null);
    setDropActive(false);
  };

  const onDropToKit = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropActive(false);
    setDraggingCode(null);
    const payload = parseDragPayload(e);
    if (!payload) {
      setMessage("드래그 데이터를 읽지 못했습니다. + 버튼으로 추가해 보세요.");
      return;
    }
    await addFromCatalog([payload]);
  };

  const onCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!dropActive) setDropActive(true);
  };

  const removeCompetency = async (comp: KitCompetency) => {
    if (!confirm(labels.removeCompConfirm(comp.nameKo))) return;
    setBusy(true);
    try {
      await fetch(`${apiBase}/competencies/${comp.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleCompetencyActive = async (comp: KitCompetency) => {
    const res = await fetch(`${apiBase}/competencies/${comp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !comp.isActive }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setCompetencies((prev) =>
      prev.map((c) => (c.id === comp.id ? { ...c, isActive: data.competency.isActive } : c)),
    );
  };

  const moveCompetency = async (compId: string, dir: -1 | 1) => {
    const idx = competencies.findIndex((c) => c.id === compId);
    const swap = idx + dir;
    if (swap < 0 || swap >= competencies.length) return;
    const next = [...competencies];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const items = next.map((c, i) => ({ id: c.id, sortOrder: i }));
    setCompetencies(next.map((c, i) => ({ ...c, sortOrder: i })));
    await fetch(`${apiBase}/competencies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  };

  const addQuestion = async (level: number) => {
    if (!selectedCompId || !selectedComp) return;
    if (selectedCompId.startsWith("pending-")) {
      setMessage("역량이 서버에 저장될 때까지 잠시만 기다려 주세요.");
      return;
    }
    const template = prompt(`L${level} 질문 문구`)?.trim();
    if (!template) return;
    const tempId = `pending-q-${Date.now()}`;
    const sortOrder = (questionsByLevel.get(level)?.length ?? 0);
    const optimistic = {
      id: tempId,
      externalId: `TEMP-${tempId}`,
      competencyId: selectedCompId,
      competencyCode: selectedComp.code,
      level,
      template,
      sortOrder,
      isActive: true,
      rubricCriteria: [],
      ...(buildNewQuestionExtra?.() ?? {}),
    } as TQ;
    setQuestions((prev) => [...prev, optimistic]);
    try {
      const res = await fetch(`${apiBase}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencyId: selectedCompId, level, template }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "추가 실패");
      const q = d.question as TQ;
      setQuestions((prev) =>
        prev.map((x) =>
          x.id === tempId ? { ...x, ...q, competencyCode: selectedComp.code } : x,
        ),
      );
      setCompetencies((prev) =>
        prev.map((c) =>
          c.id === selectedCompId ? { ...c, questionCount: c.questionCount + 1 } : c,
        ),
      );
    } catch (e) {
      setQuestions((prev) => prev.filter((x) => x.id !== tempId));
      setMessage(e instanceof Error ? e.message : "문항 추가 실패");
    }
  };

  const updateQuestion = async (q: TQ, patch: Partial<KitQuestion>) => {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
    await fetch(`${apiBase}/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const removeQuestion = async (q: TQ) => {
    if (!confirm("이 문항을 삭제할까요?")) return;
    setBusy(true);
    try {
      await fetch(`${apiBase}/questions/${q.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const moveQuestion = async (q: TQ, dir: -1 | 1) => {
    const list = [...(questionsByLevel.get(q.level) ?? [])];
    const idx = list.findIndex((x) => x.id === q.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    setQuestions((prev) => {
      const others = prev.filter((x) => x.competencyId !== q.competencyId || x.level !== q.level);
      return [...others, ...list.map((x, i) => ({ ...x, sortOrder: i }))];
    });
    if (mode === "demo") {
      const items = list.map((x, i) => ({ id: x.id, sortOrder: i }));
      await fetch(`${apiBase}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } else {
      await fetch(`${apiBase}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moves: list.map((x, i) => ({
            id: x.id,
            competencyId: x.competencyId,
            level: x.level,
            sortOrder: i,
          })),
        }),
      });
    }
  };

  const updateRubric = async (compId: string, rubricByLevel: RubricByLevel) => {
    await fetch(`${apiBase}/competencies/${compId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rubricByLevel }),
    });
    setCompetencies((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, rubricByLevel } : c)),
    );
  };

  const applyRubricToQuestions = async (
    competencyId: string,
    level: number,
    criteria: string[],
  ) => {
    if (mode === "demo") {
      const targets = questions.filter((q) => q.competencyId === competencyId && q.level === level);
      await Promise.all(
        targets.map((q) =>
          fetch(`${apiBase}/questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rubricCriteria: criteria }),
          }),
        ),
      );
    } else {
      const res = await fetch(`${apiBase}/rubrics/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencyId, level, rubricCriteria: criteria }),
      });
      if (!res.ok) throw new Error("적용 실패");
    }
    setQuestions((prev) =>
      prev.map((q) =>
        q.competencyId === competencyId && q.level === level
          ? { ...q, rubricCriteria: criteria }
          : q,
      ),
    );
  };

  const filteredClusters = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((cl) => ({
        ...cl,
        competencies: cl.competencies.filter(
          (c) =>
            c.nameKo.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q) ||
            (c.description ?? "").toLowerCase().includes(q),
        ),
      }))
      .filter((cl) => cl.competencies.length > 0);
  }, [catalog, filter]);

  const toggleCluster = (code: string) => {
    setOpenClusters((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const steps: { id: Step; n: number; label: string; hint: string }[] = [
    { id: "kit", n: 1, label: "필요 역량", hint: "메타에서 끌어오기" },
    { id: "questions", n: 2, label: "질의 조정", hint: "문항 편집" },
    { id: "rubrics", n: 3, label: "루브릭", hint: "채점 기준" },
  ];

  const goStep = (id: Step) => {
    if (id !== "kit" && competencies.length === 0) {
      setMessage(labels.goStepEmptyKitMessage);
      setStep("kit");
      return;
    }
    setStep(id);
  };

  return (
    <div className="space-y-4">
      {/* Workflow strip */}
      <div className="overflow-hidden rounded-2xl border border-card-border bg-[linear-gradient(120deg,#0f172a_0%,#1e293b_55%,#0f172a_100%)] p-4 text-white sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
          {labels.studioBadge}
        </p>
        <p className="mt-1 text-sm text-white/70">{labels.studioSubtitle}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-1">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 ? <span className="px-1 text-white/30">→</span> : null}
              <button
                type="button"
                onClick={() => goStep(s.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  step === s.id
                    ? "border-gold/50 bg-gold/15 text-white"
                    : "border-white/10 text-white/65 hover:border-white/25"
                }`}
              >
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">
                  {s.n}
                </span>
                <span className="font-medium">{s.label}</span>
                <span className="mt-0.5 block text-[10px] text-white/45 sm:ml-2 sm:mt-0 sm:inline">
                  {s.hint}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {headerActions}
      </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr]">
        {/* Left: metadata catalog (BO object browser style) */}
        <aside className="flex max-h-[min(78vh,880px)] flex-col overflow-hidden rounded-xl border border-card-border bg-card">
          <div className="border-b border-card-border px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gold">
              Metadata
            </p>
            <h2 className="text-sm font-semibold text-foreground">역량 사전</h2>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              NCS {catalogTotals.ncs} · Global {catalogTotals.global}
              {catalogTotals.global === 0 ? " (시드 필요)" : ""} — {labels.catalogAddHint}
            </p>
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="검색…"
              className="input-luxe mt-2 w-full text-xs"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {catalogLoading ? (
              <p className="px-2 py-4 text-xs text-muted">카탈로그 불러오는 중…</p>
            ) : catalogError ? (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-3 text-xs text-red-600">
                {catalogError}
              </p>
            ) : (
              filteredClusters.map((cl) => {
                const open = openClusters.has(cl.code);
                return (
                  <div key={`${cl.source}-${cl.code}`} className="mb-1">
                    <button
                      type="button"
                      onClick={() => toggleCluster(cl.code)}
                      className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-background"
                    >
                      {open ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                      )}
                      <span className="truncate">{cl.nameKo}</span>
                      <span className="ml-auto text-[10px] font-normal text-muted">
                        {cl.competencies.length}
                      </span>
                    </button>
                    {open ? (
                      <ul className="mb-2 space-y-0.5 pl-1">
                        {cl.competencies.map((c) => {
                          const inKit = kitCodes.has(c.code);
                          const adding = addingCodes.has(c.code);
                          return (
                            <li key={`${c.source}-${c.code}`}>
                              <div
                                draggable={!inKit && !adding}
                                onDragStart={(e) => {
                                  if (inKit || adding) {
                                    e.preventDefault();
                                    return;
                                  }
                                  onDragStart(e, c);
                                }}
                                onDragEnd={onDragEnd}
                                className={`group flex items-start gap-1 rounded-md border px-1.5 py-1.5 text-xs ${
                                  inKit
                                    ? "border-transparent bg-primary/5 opacity-60"
                                    : draggingCode === c.code
                                      ? "border-accent bg-accent/10"
                                      : adding
                                        ? "border-accent/40 bg-accent/5"
                                        : "cursor-grab border-transparent hover:border-card-border hover:bg-background active:cursor-grabbing"
                                }`}
                                title={c.description ?? c.code}
                              >
                                <GripVertical
                                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                    inKit ? "text-muted/30" : "text-muted/80"
                                  }`}
                                />
                                <button
                                  type="button"
                                  disabled={inKit || adding}
                                  onClick={() => {
                                    if (!inKit) void addFromCatalog([{ source: c.source, code: c.code }]);
                                  }}
                                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                                >
                                  <p className="font-medium leading-snug text-foreground">
                                    {c.nameKo}
                                    {adding ? (
                                      <span className="ml-1 text-[10px] font-normal text-accent">
                                        추가 중…
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="truncate text-[10px] text-muted">
                                    {c.source === "global" ? "Global" : "NCS"} · {c.code} ·{" "}
                                    {c.questionCount}문항
                                  </p>
                                </button>
                                {inKit ? (
                                  <span className="shrink-0 text-[10px] text-accent">{labels.inKitLabel}</span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={adding}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void addFromCatalog([{ source: c.source, code: c.code }]);
                                    }}
                                    className="shrink-0 rounded p-0.5 text-muted hover:text-accent disabled:opacity-40"
                                    aria-label={labels.addToKitAriaLabel}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: canvas by step — always accepts catalog drops */}
        <div
          className="relative min-w-0 space-y-3"
          onDragOver={onCanvasDragOver}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
          }}
          onDrop={(e) => void onDropToKit(e)}
        >
          {dropActive || draggingCode ? (
            <div
              className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed ${
                dropActive ? "border-accent bg-accent/10" : "border-card-border/40 bg-transparent"
              }`}
            >
              {dropActive ? (
                <p className="rounded-lg bg-card px-4 py-2 text-sm font-medium text-foreground shadow">
                  {labels.dropZoneLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "kit" && (
            <div
              className={`min-h-[320px] rounded-xl border-2 border-dashed p-4 transition ${
                dropActive ? "border-accent bg-accent/5" : "border-card-border bg-card"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{labels.kitPanelTitle}</h2>
                  <p className="text-xs text-muted">
                    {labels.kitPanelHint} · {competencies.length}개
                  </p>
                </div>
                {competencies.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => goStep("questions")}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    다음: 질의 조정 →
                  </button>
                ) : null}
              </div>

              {competencies.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center text-sm text-muted">
                  <p>{labels.emptyKitPrimary}</p>
                  <p className="mt-1 max-w-sm text-xs">
                    드래그가 안 되면 항목 오른쪽 <strong>+</strong> 를 누르세요. Global이 비면{" "}
                    <code className="text-[10px]">npm run db:seed:global</code>
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {competencies.map((c, idx) => (
                    <li
                      key={c.id}
                      className={`flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2 text-sm ${
                        !c.isActive ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => void moveCompetency(c.id, -1)}
                          disabled={idx === 0}
                        >
                          <ChevronUp className="h-4 w-4 text-muted" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveCompetency(c.id, 1)}
                          disabled={idx === competencies.length - 1}
                        >
                          <ChevronDown className="h-4 w-4 text-muted" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setSelectedCompId(c.id);
                          goStep("questions");
                        }}
                      >
                        <p className="font-medium text-foreground">{c.nameKo}</p>
                        <p className="text-xs text-muted">
                          {c.code} · 문항 {c.questionCount}
                        </p>
                      </button>
                      {showCompetencyActiveToggle ? (
                        <button
                          type="button"
                          onClick={() => void toggleCompetencyActive(c)}
                          className="shrink-0 text-xs text-muted hover:text-primary"
                          title={c.isActive ? "비활성화" : "활성화"}
                        >
                          {c.isActive ? "ON" : "OFF"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeCompetency(c)}
                        className="text-muted hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {step === "questions" && (
            <div className="space-y-4 rounded-xl border border-card-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">질의 조정</h2>
                  <p className="text-xs text-muted">{labels.questionsPanelHint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenLevels(new Set([1, 2, 3, 4, 5]))}
                    className="btn-secondary px-2 py-1 text-[11px]"
                  >
                    전부 펼치기
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenLevels(new Set())}
                    className="btn-secondary px-2 py-1 text-[11px]"
                  >
                    접기
                  </button>
                  <button
                    type="button"
                    onClick={() => goStep("rubrics")}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    다음: 루브릭 →
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {competencies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCompId(c.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${
                      selectedCompId === c.id
                        ? "border-primary bg-primary/10"
                        : "border-card-border text-muted"
                    }`}
                  >
                    {c.nameKo}
                    <span className="ml-1 text-muted">({c.questionCount})</span>
                  </button>
                ))}
              </div>
              {!selectedComp ? (
                <p className="text-sm text-muted">역량을 선택해 주세요.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {selectedComp.nameKo}
                    <span className="ml-2 text-xs font-normal text-muted">{selectedComp.code}</span>
                  </p>
                  {LEVELS.map((lv) => {
                    const list = questionsByLevel.get(lv) ?? [];
                    const open = openLevels.has(lv);
                    return (
                      <div
                        key={lv}
                        className="overflow-hidden rounded-xl border border-card-border bg-background"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLevels((prev) => {
                              const next = new Set(prev);
                              if (next.has(lv)) next.delete(lv);
                              else next.add(lv);
                              return next;
                            })
                          }
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-card/80"
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                          )}
                          <span className="text-sm font-semibold text-gold">L{lv}</span>
                          <span className="text-xs text-muted">{list.length}문항</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void addQuestion(lv);
                            }}
                            className="ml-auto inline-flex rounded p-1 text-muted hover:bg-card hover:text-foreground"
                            title="문항 추가"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </button>
                        {open ? (
                          <ul className="space-y-3 border-t border-card-border px-3 py-3">
                            {list.length === 0 ? (
                              <li className="text-xs text-muted">
                                문항 없음. + 로 추가하거나 전부 펼친 뒤 다른 레벨을 확인하세요.
                              </li>
                            ) : (
                              list.map((q, qIdx, arr) => (
                                <li
                                  key={q.id}
                                  className="rounded-lg border border-card-border bg-card p-3"
                                >
                                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted">
                                    {q.externalId}
                                  </label>
                                  <textarea
                                    className="mb-2 min-h-[6.5rem] w-full resize-y rounded-lg border border-card-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    value={q.template}
                                    rows={4}
                                    onChange={(e) =>
                                      setQuestions((prev) =>
                                        prev.map((x) =>
                                          x.id === q.id ? { ...x, template: e.target.value } : x,
                                        ),
                                      )
                                    }
                                    onBlur={() => void updateQuestion(q, { template: q.template })}
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] text-muted">순서</span>
                                    <button
                                      type="button"
                                      onClick={() => void moveQuestion(q, -1)}
                                      disabled={qIdx === 0}
                                      className="rounded border border-card-border px-2 py-0.5 text-xs disabled:opacity-40"
                                    >
                                      위
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void moveQuestion(q, 1)}
                                      disabled={qIdx === arr.length - 1}
                                      className="rounded border border-card-border px-2 py-0.5 text-xs disabled:opacity-40"
                                    >
                                      아래
                                    </button>
                                    <select
                                      className="rounded border border-card-border bg-background px-2 py-0.5 text-xs"
                                      value={q.level}
                                      onChange={(e) => {
                                        const level = Number(e.target.value);
                                        void updateQuestion(q, { level }).then(() => refresh());
                                      }}
                                    >
                                      {LEVELS.map((l) => (
                                        <option key={l} value={l}>
                                          L{l}로 이동
                                        </option>
                                      ))}
                                    </select>
                                    {onEditQuestionAdvanced ? (
                                      <button
                                        type="button"
                                        onClick={() => onEditQuestionAdvanced(q)}
                                        className="text-xs text-accent hover:underline"
                                      >
                                        IRT·꼬리질문
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => void removeQuestion(q)}
                                      className="ml-auto text-xs text-muted hover:text-red-500"
                                    >
                                      삭제
                                    </button>
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === "rubrics" && (
            <div className="space-y-3 rounded-xl border border-card-border bg-card p-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">루브릭 편집</h2>
                <p className="text-xs text-muted">선택 역량의 L1–L5 채점 기준을 편집합니다</p>
              </div>
              {competencies.length === 0 ? (
                <p className="text-sm text-muted">{labels.rubricsEmptyHint}</p>
              ) : (
                <CompetencyRubricPanel
                  competencies={rubricCompetencies}
                  onUpdate={updateRubric}
                  onApplyToQuestions={applyRubricToQuestions}
                  onImportComplete={refresh}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
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
import type { DemoCompetencyDto, DemoQuestionDto } from "@/lib/demo/workspace";

type Step = "kit" | "questions" | "rubrics";

type CatalogComp = {
  source: "ncs" | "global";
  code: string;
  nameKo: string;
  description: string | null;
  questionCount: number;
  clusterCode?: string;
  clusterNameKo?: string;
};

type CatalogCluster = {
  source: "ncs" | "global";
  code: string;
  nameKo: string;
  description: string | null;
  competencies: CatalogComp[];
};

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  initialCompetencies: DemoCompetencyDto[];
  initialQuestions: DemoQuestionDto[];
};

const LEVELS = [1, 2, 3, 4, 5] as const;
const DND_TYPE = "application/x-axhrd-demo-comp";

export function DemoWorkspaceEditor({
  workspaceId,
  workspaceSlug,
  initialCompetencies,
  initialQuestions,
}: Props) {
  const [step, setStep] = useState<Step>("kit");
  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedCompId, setSelectedCompId] = useState(initialCompetencies[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<CatalogCluster[]>([]);
  const [catalogTotals, setCatalogTotals] = useState({ ncs: 0, global: 0 });
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set(["NCS_IRT"]));
  const [filter, setFilter] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const base = `/api/admin/demo/workspaces/${workspaceId}`;
  const selectedComp = competencies.find((c) => c.id === selectedCompId);
  const kitCodes = useMemo(() => new Set(competencies.map((c) => c.code)), [competencies]);

  const questionsByLevel = useMemo(() => {
    const map = new Map<number, DemoQuestionDto[]>();
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
    const res = await fetch(base);
    if (!res.ok) throw new Error("새로고침 실패");
    const data = await res.json();
    setCompetencies(data.competencies);
    setQuestions(data.questions);
    if (!data.competencies.some((c: DemoCompetencyDto) => c.id === selectedCompId)) {
      setSelectedCompId(data.competencies[0]?.id ?? "");
    }
  }, [base, selectedCompId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        const res = await fetch("/api/admin/demo/catalog");
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
  }, []);

  const addFromCatalog = async (
    selections: Array<{ source: "ncs" | "global"; code: string }>,
  ) => {
    const fresh = selections.filter((s) => !kitCodes.has(s.code));
    if (fresh.length === 0) {
      setMessage("이미 키트에 있는 역량입니다.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${base}/competencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromCatalog: true, selections: fresh }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "추가 실패");
      await refresh();
      const added = (d.added as string[]) ?? [];
      setMessage(
        `${added.length}개 역량을 키트에 넣었습니다.` +
          (d.skipped?.length ? ` (건너뜀: ${d.skipped.join(", ")})` : ""),
      );
      // select first newly referenced code after refresh
      const res2 = await fetch(base);
      if (res2.ok) {
        const snap = await res2.json();
        const pick = snap.competencies.find((c: DemoCompetencyDto) =>
          added.includes(c.code),
        );
        if (pick) setSelectedCompId(pick.id);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setBusy(false);
    }
  };

  const onDragStart = (e: React.DragEvent, c: CatalogComp) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify({ source: c.source, code: c.code }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onDropToKit = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    const raw = e.dataTransfer.getData(DND_TYPE);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { source: "ncs" | "global"; code: string };
      await addFromCatalog([payload]);
    } catch {
      /* ignore */
    }
  };

  const removeCompetency = async (comp: DemoCompetencyDto) => {
    if (!confirm(`「${comp.nameKo}」을(를) 키트에서 제거할까요?`)) return;
    setBusy(true);
    try {
      await fetch(`${base}/competencies/${comp.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const moveCompetency = async (compId: string, dir: -1 | 1) => {
    const idx = competencies.findIndex((c) => c.id === compId);
    const swap = idx + dir;
    if (swap < 0 || swap >= competencies.length) return;
    const next = [...competencies];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    const items = next.map((c, i) => ({ id: c.id, sortOrder: i }));
    setCompetencies(next.map((c, i) => ({ ...c, sortOrder: i })));
    await fetch(`${base}/competencies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  };

  const addQuestion = async (level: number) => {
    if (!selectedCompId) return;
    const template = prompt(`L${level} 질문 문구`)?.trim();
    if (!template) return;
    setBusy(true);
    try {
      const res = await fetch(`${base}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competencyId: selectedCompId, level, template }),
      });
      if (!res.ok) throw new Error("추가 실패");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const updateQuestion = async (q: DemoQuestionDto, patch: Partial<DemoQuestionDto>) => {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
    await fetch(`${base}/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  };

  const removeQuestion = async (q: DemoQuestionDto) => {
    if (!confirm("이 문항을 삭제할까요?")) return;
    setBusy(true);
    try {
      await fetch(`${base}/questions/${q.id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const moveQuestion = async (q: DemoQuestionDto, dir: -1 | 1) => {
    const list = [...(questionsByLevel.get(q.level) ?? [])];
    const idx = list.findIndex((x) => x.id === q.id);
    const swap = idx + dir;
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    const items = list.map((x, i) => ({ id: x.id, sortOrder: i }));
    setQuestions((prev) => {
      const others = prev.filter((x) => x.competencyId !== q.competencyId || x.level !== q.level);
      return [...others, ...list.map((x, i) => ({ ...x, sortOrder: i }))];
    });
    await fetch(`${base}/questions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  };

  const updateRubric = async (compId: string, rubricByLevel: RubricByLevel) => {
    await fetch(`${base}/competencies/${compId}`, {
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
    const targets = questions.filter((q) => q.competencyId === competencyId && q.level === level);
    await Promise.all(
      targets.map((q) =>
        fetch(`${base}/questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rubricCriteria: criteria }),
        }),
      ),
    );
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
      setMessage("먼저 좌측 메타데이터에서 역량을 키트로 추가하세요.");
      setStep("kit");
      return;
    }
    setStep(id);
  };

  return (
    <div className="space-y-4">
      {/* Workflow strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-1">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 ? <span className="px-1 text-muted">→</span> : null}
              <button
                type="button"
                onClick={() => goStep(s.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  step === s.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-card-border text-muted hover:border-primary/40"
                }`}
              >
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-bold">
                  {s.n}
                </span>
                <span className="font-medium">{s.label}</span>
                <span className="mt-0.5 block text-[10px] text-muted sm:inline sm:ml-2 sm:mt-0">
                  {s.hint}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <a
          href={`/demo/${workspaceSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
        >
          데모 미리보기 <ExternalLink className="h-3 w-3" />
        </a>
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
              {catalogTotals.global === 0 ? " (시드 필요)" : ""} — 드래그하거나 + 로 키트에 추가
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
                          return (
                            <li key={`${c.source}-${c.code}`}>
                              <div
                                draggable={!inKit && !busy}
                                onDragStart={(e) => onDragStart(e, c)}
                                className={`group flex items-start gap-1 rounded-md border px-1.5 py-1.5 text-xs ${
                                  inKit
                                    ? "border-transparent bg-primary/5 opacity-60"
                                    : "cursor-grab border-transparent hover:border-card-border hover:bg-background active:cursor-grabbing"
                                }`}
                                title={c.description ?? c.code}
                              >
                                <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted/60" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium leading-snug text-foreground">
                                    {c.nameKo}
                                  </p>
                                  <p className="truncate text-[10px] text-muted">
                                    {c.source === "global" ? "Global" : "NCS"} · {c.code} ·{" "}
                                    {c.questionCount}문항
                                  </p>
                                </div>
                                {inKit ? (
                                  <span className="shrink-0 text-[10px] text-accent">키트</span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() =>
                                      void addFromCatalog([{ source: c.source, code: c.code }])
                                    }
                                    className="shrink-0 rounded p-0.5 text-muted opacity-0 hover:text-accent group-hover:opacity-100"
                                    aria-label="키트에 추가"
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

        {/* Right: canvas by step */}
        <div className="min-w-0 space-y-3">
          {step === "kit" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDropActive(true);
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={(e) => void onDropToKit(e)}
              className={`min-h-[320px] rounded-xl border-2 border-dashed p-4 transition ${
                dropActive
                  ? "border-accent bg-accent/5"
                  : "border-card-border bg-card"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">필요 역량 키트</h2>
                  <p className="text-xs text-muted">
                    좌측에서 끌어다 놓거나 + 로 추가 · {competencies.length}개 선택됨
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
                  <p>여기에 역량을 놓으세요.</p>
                  <p className="mt-1 text-xs">
                    Global 20이 안 보이면 운영 DB에{" "}
                    <code className="text-[10px]">npm run db:seed:global</code> 가 필요합니다.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {competencies.map((c, idx) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
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
                  <p className="text-xs text-muted">키트에 넣은 역량별로 문항을 다듬습니다</p>
                </div>
                <button
                  type="button"
                  onClick={() => goStep("rubrics")}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  다음: 루브릭 →
                </button>
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
                  </button>
                ))}
              </div>
              {!selectedComp ? (
                <p className="text-sm text-muted">역량을 선택해 주세요.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {LEVELS.map((lv) => (
                    <div key={lv} className="rounded-xl border border-card-border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gold">L{lv}</span>
                        <button
                          type="button"
                          onClick={() => void addQuestion(lv)}
                          disabled={busy}
                          className="text-muted hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <ul className="space-y-2">
                        {(questionsByLevel.get(lv) ?? []).map((q, qIdx, arr) => (
                          <li key={q.id} className="rounded border border-card-border p-2 text-xs">
                            <textarea
                              className="input-luxe mb-1 min-h-[4rem] w-full resize-y text-xs"
                              value={q.template}
                              onChange={(e) =>
                                setQuestions((prev) =>
                                  prev.map((x) =>
                                    x.id === q.id ? { ...x, template: e.target.value } : x,
                                  ),
                                )
                              }
                              onBlur={() => void updateQuestion(q, { template: q.template })}
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => void moveQuestion(q, -1)}
                                  disabled={qIdx === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void moveQuestion(q, 1)}
                                  disabled={qIdx === arr.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                              <button type="button" onClick={() => void removeQuestion(q)}>
                                <Trash2 className="h-3 w-3 text-muted" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                <p className="text-sm text-muted">키트에 역량을 먼저 추가하세요.</p>
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

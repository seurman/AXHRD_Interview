"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  Layers,
  ListTree,
  Loader2,
  Plus,
  Save,
  Search,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  CompetencyRubricPanel,
  mapCompetencyRubrics,
  type RubricCompetency,
} from "@/components/admin/CompetencyRubricPanel";
import { QuestionEditModal } from "@/components/admin/kit-studio/QuestionEditModal";
import type { BankCompetencyRow, BankCluster } from "@/lib/competency/content-bank-data";
import {
  BANK_QUESTION_DEFAULTS,
  type BankQuestion,
} from "@/components/admin/kit-studio/bank-types";
import type { CatalogCluster } from "@/components/admin/kit-studio/types";
import { MotionReorderList } from "@/components/org/MotionReorderList";
import type { RubricByLevel } from "@/lib/competency/rubric";
import { competencyLabel } from "@/lib/labels";

const LEVELS = [1, 2, 3, 4, 5] as const;
const DND_QUESTION = "application/x-axhrd-bank-question";

type Tab = "competencies" | "questions" | "levels" | "rubrics";

const SOURCE_LABEL: Record<string, string> = {
  NCS: "NCS",
  GLOBAL: "Global",
  CUSTOM: "Custom",
};

/** CMS 드롭다운·테이블 — 한국어 표시명 + 시스템 code */
function competencyOptionLabel(c: { code: string; nameKo?: string | null }): string {
  const ko = c.nameKo?.trim() || competencyLabel(c.code);
  return ko === c.code ? c.code : `${ko} (${c.code})`;
}

type Props = {
  initialClusters: BankCluster[];
  initialCompetencies: BankCompetencyRow[];
  initialQuestions: BankQuestion[];
  layout?: "full" | "workspace";
  workspacePanel?: "questions" | "levels" | "rubrics";
  controlledSelectedId?: string;
  onRefresh?: () => Promise<void>;
};

export function ContentMetadataStudio({
  initialClusters,
  initialCompetencies,
  initialQuestions,
  layout = "full",
  workspacePanel = "levels",
  controlledSelectedId,
  onRefresh: onExternalRefresh,
}: Props) {
  const isWorkspace = layout === "workspace";
  const [tab, setTab] = useState<Tab>("questions");
  const [clusters, setClusters] = useState(initialClusters);
  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState(initialCompetencies[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState<CatalogCluster[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [openClusters, setOpenClusters] = useState<Set<string>>(new Set(["NCS_IRT"]));
  const [dragOverCompId, setDragOverCompId] = useState<string | null>(null);
  const [dragOverLevel, setDragOverLevel] = useState<number | null>(null);
  const [qSearch, setQSearch] = useState("");
  const [qCompFilter, setQCompFilter] = useState<string>("all");
  const [qLevelFilter, setQLevelFilter] = useState<number | "all">("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");

  const [compDraft, setCompDraft] = useState({ nameKo: "", description: "" });
  const [newComp, setNewComp] = useState({ code: "", nameKo: "", description: "" });
  const [showNewComp, setShowNewComp] = useState(false);

  const activeTab: Tab = isWorkspace ? workspacePanel : tab;
  const activeSelectedId =
    isWorkspace && controlledSelectedId ? controlledSelectedId : selectedId;

  const selected = competencies.find((c) => c.id === activeSelectedId);
  const visibleCompetencies = useMemo(() => {
    if (clusterFilter === "all") return competencies;
    return competencies.filter((c) => c.clusterId === clusterFilter);
  }, [competencies, clusterFilter]);
  const compOrder = useMemo(() => visibleCompetencies.map((c) => c.id), [visibleCompetencies]);
  const compById = useMemo(() => new Map(competencies.map((c) => [c.id, c])), [competencies]);

  const questionsByLevel = useMemo(() => {
    const map = new Map<number, BankQuestion[]>();
    for (const lv of LEVELS) map.set(lv, []);
    for (const q of questions) {
      if (q.competencyId !== activeSelectedId) continue;
      map.get(q.level)?.push(q);
    }
    for (const lv of LEVELS) {
      map.get(lv)?.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [questions, activeSelectedId]);

  const filteredQuestions = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    return questions.filter((item) => {
      if (qCompFilter !== "all" && item.competencyId !== qCompFilter) return false;
      if (qLevelFilter !== "all" && item.level !== qLevelFilter) return false;
      if (!q) return true;
      const compKo = compById.get(item.competencyId)?.nameKo ?? "";
      return (
        (item.template ?? "").toLowerCase().includes(q) ||
        (item.externalId ?? "").toLowerCase().includes(q) ||
        (item.competencyCode ?? "").toLowerCase().includes(q) ||
        compKo.toLowerCase().includes(q) ||
        competencyLabel(item.competencyCode).toLowerCase().includes(q)
      );
    });
  }, [questions, qSearch, qCompFilter, qLevelFilter, compById]);

  const rubricCompetencies: RubricCompetency[] = useMemo(
    () => mapCompetencyRubrics(competencies),
    [competencies],
  );

  useEffect(() => {
    if (isWorkspace && controlledSelectedId) {
      setQCompFilter(controlledSelectedId);
    }
  }, [isWorkspace, controlledSelectedId]);

  useEffect(() => {
    if (!selected) return;
    setCompDraft({
      nameKo: selected.nameKo,
      description: selected.description ?? "",
    });
  }, [selectedId, selected?.nameKo, selected?.description, selected]);

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

  async function refresh() {
    const res = await fetch("/api/admin/content-bank");
    if (!res.ok) throw new Error("새로고침 실패");
    const data = await res.json();
    setCompetencies(data.competencies);
    setQuestions(data.questions);
    if (data.clusters) setClusters(data.clusters);
    if (!isWorkspace && !data.competencies.some((c: BankCompetencyRow) => c.id === selectedId)) {
      setSelectedId(data.competencies[0]?.id ?? "");
    }
    if (onExternalRefresh) await onExternalRefresh();
  }

  async function saveCompetencyOrder(nextIds: string[]) {
    const items = nextIds.map((id, sortOrder) => ({ id, sortOrder }));
    setCompetencies((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      return nextIds.map((id, sortOrder) => ({ ...byId.get(id)!, sortOrder }));
    });
    await fetch("/api/admin/competencies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  }

  async function saveCompetencyMeta() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/competencies/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameKo: compDraft.nameKo.trim(),
          description: compDraft.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "저장 실패");
      setCompetencies((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, nameKo: data.competency.nameKo, description: data.competency.description }
            : c,
        ),
      );
      setMessage("역량 메타데이터를 저장했습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCompetencyActive(comp: BankCompetencyRow) {
    const res = await fetch(`/api/admin/competencies/${comp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !comp.isActive }),
    });
    if (!res.ok) return;
    setCompetencies((prev) =>
      prev.map((c) => (c.id === comp.id ? { ...c, isActive: !c.isActive } : c)),
    );
  }

  async function deleteCompetency(comp: BankCompetencyRow) {
    if (!confirm(`역량 「${comp.nameKo}」을(를) 삭제(또는 비활성화)할까요?`)) return;
    const res = await fetch(`/api/admin/competencies/${comp.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? data.message ?? "삭제 실패");
      return;
    }
    await refresh();
    setMessage(data.message ?? "처리했습니다.");
  }

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
      setMessage(`역량 ${code}을(를) 추가했습니다.`);
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

  function buildMovesForLevel(compId: string, level: number, orderedIds: string[]) {
    return orderedIds.map((id, sortOrder) => ({
      id,
      competencyId: compId,
      level,
      sortOrder,
    }));
  }

  async function persistQuestionMoves(
    moves: Array<{ id: string; competencyId: string; level: number; sortOrder: number }>,
  ) {
    if (moves.length === 0) return;
    await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moves }),
    });
  }

  async function reorderLevel(level: number, orderedIds: string[]) {
    if (!selected) return;
    setQuestions((prev) => {
      const others = prev.filter((q) => q.competencyId !== selected.id || q.level !== level);
      const reordered = orderedIds.map((id, sortOrder) => {
        const q = prev.find((x) => x.id === id)!;
        return { ...q, sortOrder };
      });
      return [...others, ...reordered];
    });
    await persistQuestionMoves(buildMovesForLevel(selected.id, level, orderedIds));
  }

  async function moveQuestionTo(questionId: string, targetCompId: string, targetLevel: number) {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;
    const targetQs = questions
      .filter(
        (x) => x.competencyId === targetCompId && x.level === targetLevel && x.id !== questionId,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const sortOrder = targetQs.length;
    const moves = [
      ...buildMovesForLevel(targetCompId, targetLevel, [...targetQs.map((x) => x.id), questionId]),
    ];
    if (q.competencyId === targetCompId && q.level === targetLevel) return;
    const sourceQs = questions
      .filter(
        (x) => x.competencyId === q.competencyId && x.level === q.level && x.id !== questionId,
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
    moves.push(...buildMovesForLevel(q.competencyId, q.level, sourceQs.map((x) => x.id)));
    const targetCode = compById.get(targetCompId)?.code ?? q.competencyCode;
    setQuestions((prev) =>
      prev.map((x) =>
        x.id === questionId
          ? { ...x, competencyId: targetCompId, competencyCode: targetCode, level: targetLevel, sortOrder }
          : x,
      ),
    );
    setCompetencies((prev) =>
      prev.map((c) => {
        if (c.id === targetCompId) return { ...c, questionCount: c.questionCount + 1 };
        if (c.id === q.competencyId) return { ...c, questionCount: Math.max(0, c.questionCount - 1) };
        return c;
      }),
    );
    await persistQuestionMoves(moves);
    setMessage("문항 매핑을 변경했습니다.");
  }

  async function addQuestion(level: number, competencyId?: string) {
    const compId = competencyId ?? activeSelectedId;
    const comp = compById.get(compId);
    if (!comp) return;
    const template = prompt(`L${level} 새 질문 텍스트를 입력하세요:`);
    if (!template?.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencyId: compId,
          level,
          template: template.trim(),
          ...BANK_QUESTION_DEFAULTS,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "추가 실패");
      await refresh();
      setMessage("문항을 추가했습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setBusy(false);
    }
  }

  async function updateQuestionField(q: BankQuestion, patch: Partial<BankQuestion>) {
    const res = await fetch(`/api/admin/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    setQuestions((prev) =>
      prev.map((x) => {
        if (x.id !== q.id) return x;
        const next = { ...x, ...patch };
        if (patch.competencyId) {
          next.competencyCode = compById.get(patch.competencyId)?.code ?? x.competencyCode;
        }
        return next;
      }),
    );
  }

  async function deleteQuestion(q: BankQuestion) {
    if (!confirm("이 문항을 삭제(또는 비활성화)할까요?")) return;
    const res = await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
    if (!res.ok) return;
    await refresh();
  }

  function onQuestionDragStart(e: React.DragEvent, questionId: string) {
    e.dataTransfer.setData(DND_QUESTION, questionId);
    e.dataTransfer.effectAllowed = "move";
  }

  const tabs: { id: Tab; label: string; icon: typeof Table2; hint: string }[] = [
    { id: "questions", label: "문항 테이블", icon: Table2, hint: "전체 CRUD · 역량 매핑" },
    { id: "competencies", label: "역량 목록", icon: ListTree, hint: "생성 · 순서 · 메타" },
    { id: "levels", label: "레벨별 편집", icon: Layers, hint: "드래그 정렬 · 레벨 이동" },
    { id: "rubrics", label: "루브릭", icon: Database, hint: "L1~L5 채점 기준" },
  ];

  return (
    <div className="space-y-4" data-cms={isWorkspace ? "framework-workspace" : "metadata-v2"}>
      {!isWorkspace && (
        <>
      <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 via-card to-gold/5 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
          Platform metadata CMS
        </p>
        <h2 className="mt-1 text-lg font-bold text-foreground">통합 역량 풀 CMS</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          NCS·Global·Custom 역량이 하나의 IRT 문항 뱅크입니다. 좌측 역량군(클러스터)으로 필터하고
          역량·문항·루브릭을 편집하세요. 기관 킷 조립은{" "}
          <strong className="text-foreground">인터뷰 킷 스튜디오</strong>에서 합니다.
        </p>
      </div>

      <aside className="card-luxe flex flex-wrap gap-2 p-3">
        <span className="w-full text-xs font-semibold uppercase text-muted">역량군</span>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-xs ${clusterFilter === "all" ? "bg-accent/15 font-semibold" : "hover:bg-card-border/40"}`}
          onClick={() => setClusterFilter("all")}
        >
          전체 ({competencies.length})
        </button>
        {clusters.map((cl) => (
          <button
            key={cl.id}
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs ${clusterFilter === cl.id ? "bg-accent/15 font-semibold" : "hover:bg-card-border/40"}`}
            onClick={() => {
              setClusterFilter(cl.id);
              const first = competencies.find((c) => c.clusterId === cl.id);
              if (first) setSelectedId(first.id);
            }}
          >
            {cl.nameKo}{" "}
            <span className="text-muted">
              · {SOURCE_LABEL[cl.source] ?? cl.source} · {cl.competencyCount}
            </span>
          </button>
        ))}
      </aside>

      <div className="flex flex-wrap gap-2 border-b border-card-border pb-1">
        {tabs.map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition ${
              tab === id
                ? "border-accent font-semibold text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <span className="hidden text-[10px] text-muted sm:inline">· {hint}</span>
          </button>
        ))}
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
          onClick={() => {
            setShowNewComp((v) => !v);
            setTab("competencies");
          }}
        >
          <Plus className="h-4 w-4" />
          역량 추가
        </button>
        <button
          type="button"
          className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          onClick={() => void addQuestion(3)}
        >
          <Plus className="h-4 w-4" />
          문항 빠른 추가 (L3)
        </button>
      </div>

      {message ? (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">{message}</p>
      ) : null}

      {showNewComp ? (
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
            {busy ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "역량 생성"}
          </button>
        </div>
      ) : null}

      {showCatalog ? (
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
      ) : null}
        </>
      )}

      {activeTab === "questions" ? (
        <div className="card-luxe overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-card-border p-4">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                className="input-luxe w-full pl-9"
                placeholder="문항 검색 (텍스트 · ID · 역량코드)"
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
              />
            </div>
            {!isWorkspace && (
            <select
              className="input-luxe"
              value={qCompFilter}
              onChange={(e) => setQCompFilter(e.target.value)}
            >
              <option value="all">모든 역량</option>
              {visibleCompetencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {competencyOptionLabel(c)} · {SOURCE_LABEL[c.source]}
                </option>
              ))}
            </select>
            )}
            <select
              className="input-luxe"
              value={qLevelFilter}
              onChange={(e) =>
                setQLevelFilter(e.target.value === "all" ? "all" : Number(e.target.value))
              }
            >
              <option value="all">모든 레벨</option>
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  L{lv}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">{filteredQuestions.length}건</span>
          </div>
          <div className="max-h-[min(70vh,720px)] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-card text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">역량</th>
                  <th className="px-3 py-2">Lv</th>
                  <th className="px-3 py-2">질문</th>
                  <th className="px-3 py-2">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="border-t border-card-border/60 hover:bg-accent/[0.03]">
                    <td className="px-3 py-2 font-mono text-[11px] text-muted">{q.externalId}</td>
                    <td className="px-3 py-2">
                      <select
                        className="input-luxe max-w-[140px] py-1 text-xs"
                        value={q.competencyId}
                        onChange={(e) => {
                          const compId = e.target.value;
                          void moveQuestionTo(q.id, compId, q.level);
                        }}
                      >
                        {competencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {competencyOptionLabel(c)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="input-luxe w-16 py-1 text-xs"
                        value={q.level}
                        onChange={(e) => {
                          const level = Number(e.target.value);
                          void moveQuestionTo(q.id, q.competencyId, level);
                        }}
                      >
                        {LEVELS.map((lv) => (
                          <option key={lv} value={lv}>
                            L{lv}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        className="input-luxe min-h-[48px] w-full text-xs"
                        defaultValue={q.template}
                        onBlur={(e) => void updateQuestionField(q, { template: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-accent hover:underline"
                          onClick={() => setEditing(q)}
                        >
                          IRT
                        </button>
                        <button
                          type="button"
                          className="text-muted hover:text-red-600"
                          onClick={() => void deleteQuestion(q)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredQuestions.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted">조건에 맞는 문항이 없습니다.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "competencies" && !isWorkspace ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="card-luxe p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">드래그로 순서 변경</p>
            <MotionReorderList
              ids={compOrder}
              onReorder={(next) => void saveCompetencyOrder(next)}
              renderItem={(id) => {
                const c = competencies.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <button
                    type="button"
                    className={`w-full rounded-lg px-2 py-1.5 text-left ${
                      c.id === selectedId ? "bg-accent/10 font-medium" : ""
                    }`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    {c.nameKo}
                    <span className="ml-1 text-[10px] text-muted">{c.code}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">
                      {SOURCE_LABEL[c.source]} · {c.questionCount}문항
                    </span>
                  </button>
                );
              }}
            />
          </aside>
          {selected ? (
            <div className="card-luxe space-y-3 p-4">
              <div className="flex justify-between gap-2">
                <h3 className="font-bold">{competencyOptionLabel(selected)}</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary text-xs"
                    onClick={() => void toggleCompetencyActive(selected)}
                  >
                    {selected.isActive ? "비활성화" : "활성화"}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => void deleteCompetency(selected)}
                  >
                    삭제
                  </button>
                </div>
              </div>
              <input
                className="input-luxe w-full"
                value={compDraft.nameKo}
                onChange={(e) => setCompDraft({ ...compDraft, nameKo: e.target.value })}
              />
              <textarea
                className="input-luxe min-h-[80px] w-full"
                value={compDraft.description}
                onChange={(e) => setCompDraft({ ...compDraft, description: e.target.value })}
              />
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1.5"
                disabled={busy}
                onClick={() => void saveCompetencyMeta()}
              >
                <Save className="h-4 w-4" />
                저장
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "levels" && selected ? (
        <div className={`grid gap-4 ${isWorkspace ? "" : "lg:grid-cols-[220px_1fr]"}`}>
          {!isWorkspace && (
          <aside className="card-luxe space-y-1 p-2">
            {visibleCompetencies.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  c.id === selectedId ? "bg-accent/10 font-medium" : "hover:bg-card-border/30"
                } ${dragOverCompId === c.id ? "ring-2 ring-gold" : ""}`}
                onClick={() => setSelectedId(c.id)}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes(DND_QUESTION)) {
                    e.preventDefault();
                    setDragOverCompId(c.id);
                  }
                }}
                onDragLeave={() => setDragOverCompId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCompId(null);
                  const qid = e.dataTransfer.getData(DND_QUESTION);
                  if (qid) void moveQuestionTo(qid, c.id, questions.find((x) => x.id === qid)?.level ?? 3);
                }}
              >
                {c.nameKo}
              </button>
            ))}
          </aside>
          )}
          <div className="space-y-3">
            {LEVELS.map((level) => {
              const list = questionsByLevel.get(level) ?? [];
              const ids = list.map((q) => q.id);
              return (
                <div
                  key={level}
                  className={`card-luxe p-4 ${dragOverLevel === level ? "ring-2 ring-accent" : ""}`}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes(DND_QUESTION)) {
                      e.preventDefault();
                      setDragOverLevel(level);
                    }
                  }}
                  onDragLeave={() => setDragOverLevel(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverLevel(null);
                    const qid = e.dataTransfer.getData(DND_QUESTION);
                    if (qid) void moveQuestionTo(qid, selected.id, level);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="font-semibold">
                      L{level} · {list.length}문항
                    </h4>
                    <button
                      type="button"
                      className="text-xs text-accent"
                      onClick={() => void addQuestion(level)}
                    >
                      + 추가
                    </button>
                  </div>
                  {ids.length === 0 ? (
                    <p className="text-xs text-muted">문항을 드래그하거나 추가하세요</p>
                  ) : (
                    <MotionReorderList
                      ids={ids}
                      onReorder={(next) => void reorderLevel(level, next)}
                      renderItem={(qid) => {
                        const q = list.find((x) => x.id === qid);
                        if (!q) return null;
                        return (
                          <div
                            draggable
                            onDragStart={(e) => onQuestionDragStart(e, q.id)}
                            className="space-y-1"
                          >
                            <p className="font-mono text-[10px] text-muted">{q.externalId}</p>
                            <textarea
                              className="input-luxe min-h-[48px] w-full text-xs"
                              defaultValue={q.template}
                              onBlur={(e) => void updateQuestionField(q, { template: e.target.value })}
                            />
                          </div>
                        );
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeTab === "levels" && !selected ? (
        <p className="text-sm text-muted">역량을 먼저 추가하세요.</p>
      ) : null}

      {activeTab === "rubrics" ? (
        <div className="card-luxe p-4">
          <CompetencyRubricPanel
            competencies={selected ? mapCompetencyRubrics([selected]) : rubricCompetencies}
            onUpdate={async (id, rubricByLevel: RubricByLevel) => {
              await fetch(`/api/admin/competencies/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rubricByLevel }),
              });
              await refresh();
            }}
            onApplyToQuestions={async (competencyId, level, criteria) => {
              await fetch("/api/admin/rubrics/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ competencyId, level, criteria }),
              });
              await refresh();
            }}
            onImportComplete={() => void refresh()}
          />
        </div>
      ) : null}

      {editing ? (
        <QuestionEditModal
          question={editing}
          onClose={() => setEditing(null)}
          onSave={async (q) => {
            const res = await fetch(`/api/admin/questions/${q.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(q),
            });
            if (!res.ok) {
              const data = await res.json();
              alert(data.error ?? "저장 실패");
              return;
            }
            setEditing(null);
            await refresh();
          }}
          onDelete={async (q) => {
            await deleteQuestion(q);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

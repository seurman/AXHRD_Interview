"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Search,
  Layers,
  LayoutPanelLeft,
  Sparkles,
  ChevronRight,
  X,
} from "lucide-react";
import { competencyLabel } from "@/lib/labels";
import {
  kitQuestionSortId,
  parseKitQuestionSortId,
  type ApiCompetency,
  type ApiPayload,
  type ApiQuestion,
  type CompetencyDraft,
} from "@/components/org/kit-workspace-types";

const COMP_STYLES: Record<string, { bar: string; glow: string }> = {
  COMMUNICATION: { bar: "bg-sky-500", glow: "ring-sky-300/50" },
  PROBLEM_SOLVING: { bar: "bg-violet-500", glow: "ring-violet-300/50" },
  JOB_FIT: { bar: "bg-emerald-500", glow: "ring-emerald-300/50" },
  ORG_FIT: { bar: "bg-amber-500", glow: "ring-amber-300/50" },
  LEADERSHIP: { bar: "bg-rose-500", glow: "ring-rose-300/50" },
  GROWTH: { bar: "bg-teal-500", glow: "ring-teal-300/50" },
};

function compStyle(code: string) {
  return COMP_STYLES[code] ?? { bar: "bg-accent", glow: "ring-accent/30" };
}

function previewText(text: string, max = 100): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

type WorkspaceProps = {
  data: ApiPayload;
  kitCompetencies: string[];
  paletteCode: string;
  activeCode: string;
  drafts: Record<string, CompetencyDraft>;
  search: string;
  levelFilter: number | null;
  dragItem: { kind: "comp" | "question"; label: string; level?: number } | null;
  questionById: Map<string, ApiQuestion>;
  questionsByComp: Map<string, ApiQuestion[]>;
  compByCode: Map<string, ApiCompetency>;
  onPaletteCode: (code: string) => void;
  onActiveCode: (code: string) => void;
  onSearch: (v: string) => void;
  onLevelFilter: (v: number | null) => void;
  onDragItem: (v: WorkspaceProps["dragItem"]) => void;
  onAddCompetency: (code: string) => void;
  onRemoveCompetency: (code: string) => void;
  onAddQuestion: (code: string, questionId: string) => void;
  onRemoveQuestion: (code: string, questionId: string) => void;
  onReorderQuestions: (code: string, ids: string[]) => void;
  onPatchDraft: (code: string, patch: Partial<CompetencyDraft>) => void;
  onSave: (code: string) => void;
};

function PaletteCompetencyCard({
  comp,
  questionCount,
  inKit,
  selected,
  onSelect,
  onAdd,
}: {
  comp: ApiCompetency;
  questionCount: number;
  inKit: boolean;
  selected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const style = compStyle(comp.code);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-comp-${comp.code}`,
    data: { type: "palette-comp", code: comp.code },
    disabled: inKit,
  });

  return (
    <div
      ref={setNodeRef}
      className={`group flex items-stretch overflow-hidden rounded-xl border transition ${
        selected ? `border-gold/50 ring-2 ${style.glow}` : "border-white/10"
      } ${inKit ? "opacity-45" : ""} ${isDragging ? "scale-[0.98] opacity-60" : ""}`}
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 100%)" }}
    >
      <div className={`w-1 ${style.bar}`} />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-3 py-2.5 text-left">
        <p className="text-sm font-semibold text-white">{comp.nameKo}</p>
        <p className="text-[11px] text-white/50">
          {competencyLabel(comp.code)} · {questionCount}문항
        </p>
      </button>
      {!inKit && (
        <>
          <button
            type="button"
            className="cursor-grab px-1 text-white/40 hover:text-white"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="px-2.5 text-white/50 hover:bg-white/10 hover:text-gold"
          >
            <Plus className="h-4 w-4" />
          </button>
        </>
      )}
      {inKit && <span className="px-3 text-[10px] font-bold text-gold">IN KIT</span>}
    </div>
  );
}

function BankQuestionCard({ q, onAdd }: { q: ApiQuestion; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bank-q-${q.id}`,
    data: { type: "bank-q", questionId: q.id, competencyCode: q.competencyCode },
    disabled: !q.isActive,
  });

  return (
    <div
      ref={setNodeRef}
      onDoubleClick={q.isActive ? onAdd : undefined}
      className={`flex gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 ${
        !q.isActive ? "opacity-40" : "cursor-grab hover:border-gold/40"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <button type="button" className="text-white/40" disabled={!q.isActive} {...listeners} {...attributes}>
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gold">L{q.level}</span>
        <p className="mt-1 text-xs text-white/85">{previewText(q.template, 88)}</p>
      </div>
    </div>
  );
}

function KitQuestionRow({
  sortId,
  index,
  question,
  onRemove,
}: {
  sortId: string;
  index: number;
  question: ApiQuestion | undefined;
  onRemove: () => void;
}) {
  const parsed = parseKitQuestionSortId(sortId);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortId,
    data: { type: "kit-q", code: parsed?.code, questionId: parsed?.questionId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-start gap-2 rounded-lg border border-card-border bg-white p-2.5 shadow-sm"
    >
      <button type="button" className="cursor-grab text-muted" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <span className="text-[10px] text-muted">{index + 1}.</span>{" "}
        <span className="text-[10px] font-bold text-gold">L{question?.level ?? "?"}</span>
        <p className="mt-0.5 text-xs">{question ? previewText(question.template, 72) : "—"}</p>
      </div>
      <button type="button" onClick={onRemove} className="text-muted hover:text-red-500">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CompetencyKitPanel({
  comp,
  draft,
  questionById,
  active,
  limits,
  onSelect,
  onRemove,
  onRemoveQuestion,
}: {
  comp: ApiCompetency;
  draft: CompetencyDraft;
  questionById: Map<string, ApiQuestion>;
  active: boolean;
  limits: { min: number; recommended: number };
  onSelect: () => void;
  onRemove: () => void;
  onRemoveQuestion: (questionId: string) => void;
}) {
  const style = compStyle(comp.code);
  const { setNodeRef, isOver } = useDroppable({ id: `drop-kit-q-${comp.code}` });
  const levelCounts = [0, 0, 0, 0, 0, 0];
  for (const id of draft.selectedIds) {
    const q = questionById.get(id);
    if (q && q.level >= 1 && q.level <= 5) levelCounts[q.level]++;
  }
  const sortIds = draft.selectedIds.map((id) => kitQuestionSortId(comp.code, id));

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        active ? `border-accent/50 ring-2 ${style.glow}` : "border-card-border"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-card-border px-4 py-3">
        <div className={`h-9 w-1 rounded-full ${style.bar}`} />
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-foreground">{comp.nameKo}</p>
          <p className="text-xs text-muted">
            {draft.selectedIds.length}문항
            {draft.selectedIds.length >= limits.min ? " · IRT 준비됨" : ` · ${limits.min}개 이상 권장`}
          </p>
        </button>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((lv) => (
            <div
              key={lv}
              className={`h-5 w-1.5 rounded-full ${levelCounts[lv] ? style.bar : "bg-card-border"}`}
            />
          ))}
        </div>
        <button type="button" onClick={onRemove} className="p-1.5 text-muted hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[100px] p-3 ${isOver ? "bg-accent/5 ring-2 ring-inset ring-accent/20" : ""}`}
      >
        {draft.selectedIds.length === 0 ? (
          <p className="flex h-20 items-center justify-center rounded-xl border border-dashed text-center text-xs text-muted">
            문항을 드래그하여 추가
          </p>
        ) : (
          <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {draft.selectedIds.map((id, index) => (
                <KitQuestionRow
                  key={id}
                  sortId={kitQuestionSortId(comp.code, id)}
                  index={index}
                  question={questionById.get(id)}
                  onRemove={() => onRemoveQuestion(id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

export function InterviewKitWorkspace(props: WorkspaceProps) {
  const {
    data,
    kitCompetencies,
    paletteCode,
    activeCode,
    drafts,
    search,
    levelFilter,
    dragItem,
    questionById,
    questionsByComp,
    compByCode,
    onPaletteCode,
    onActiveCode,
    onSearch,
    onLevelFilter,
    onDragItem,
    onAddCompetency,
    onRemoveCompetency,
    onAddQuestion,
    onRemoveQuestion,
    onReorderQuestions,
    onPatchDraft,
    onSave,
  } = props;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { setNodeRef: canvasRef, isOver: canvasOver } = useDroppable({ id: "drop-kit-canvas" });

  const bankQuestions = useMemo(() => {
    const all = questionsByComp.get(paletteCode) ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((item) => {
      if (levelFilter !== null && item.level !== levelFilter) return false;
      if (q && !item.template.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [questionsByComp, paletteCode, search, levelFilter]);

  const activeComp = compByCode.get(activeCode);
  const activeDraft = drafts[activeCode];
  const totalQuestions = kitCompetencies.reduce(
    (sum, code) => sum + (drafts[code]?.selectedIds.length ?? 0),
    0
  );

  function handleDragStart(e: DragStartEvent) {
    const d = e.active.data.current;
    if (d?.type === "palette-comp") {
      const comp = compByCode.get(d.code as string);
      onDragItem({ kind: "comp", label: comp?.nameKo ?? String(d.code) });
    }
    if (d?.type === "bank-q") {
      const q = questionById.get(d.questionId as string);
      onDragItem({
        kind: "question",
        label: q ? previewText(q.template, 48) : "문항",
        level: q?.level,
      });
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    onDragItem(null);
    const { active, over } = e;
    if (!over) return;
    const activeData = active.data.current;
    const overId = String(over.id);

    if (activeData?.type === "palette-comp") {
      if (overId === "drop-kit-canvas" || overId.startsWith("drop-kit-q-")) {
        onAddCompetency(activeData.code as string);
      }
      return;
    }

    if (activeData?.type === "bank-q") {
      const qId = activeData.questionId as string;
      const q = questionById.get(qId);
      if (!q) return;
      let target = activeCode || paletteCode;
      if (overId.startsWith("drop-kit-q-")) target = overId.replace("drop-kit-q-", "");
      const parsed = parseKitQuestionSortId(overId);
      if (parsed) target = parsed.code;
      if (q.competencyCode === target) onAddQuestion(target, qId);
      return;
    }

    if (activeData?.type === "kit-q") {
      const code = activeData.code as string;
      const activeQId = activeData.questionId as string;
      const parsed = parseKitQuestionSortId(overId);
      if (!parsed || parsed.code !== code) return;
      const draft = drafts[code];
      if (!draft) return;
      const oldIdx = draft.selectedIds.indexOf(activeQId);
      const newIdx = draft.selectedIds.indexOf(parsed.questionId);
      if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return;
      onReorderQuestions(code, arrayMove(draft.selectedIds, oldIdx, newIdx));
    }
  }

  if (!activeComp || !activeDraft) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-card-border bg-gradient-to-r from-slate-50 via-white to-gold/5 px-5 py-3">
          <Sparkles className="h-5 w-5 text-gold" />
          <span className="text-sm font-semibold">인터뷰 킷 워크스페이스</span>
          <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
            역량 {kitCompetencies.length}
          </span>
          <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
            문항 {totalQuestions}
          </span>
          <span className="text-xs text-muted">SPSS 변수창 + HireVue 빌더 스타일</span>
        </div>

        <div className="grid min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-card-border shadow-luxe lg:grid-cols-[260px_1fr_280px]">
          <aside className="flex flex-col bg-[#0f172a] text-white lg:border-r lg:border-white/10">
            <div className="border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
                <LayoutPanelLeft className="h-4 w-4" />
                변수 팔레트
              </div>
            </div>
            <div className="space-y-2 overflow-y-auto p-3">
              {data.competencies.map((c) => (
                <PaletteCompetencyCard
                  key={c.code}
                  comp={c}
                  questionCount={(questionsByComp.get(c.code) ?? []).filter((x) => x.isActive).length}
                  inKit={kitCompetencies.includes(c.code)}
                  selected={paletteCode === c.code}
                  onSelect={() => onPaletteCode(c.code)}
                  onAdd={() => onAddCompetency(c.code)}
                />
              ))}
            </div>
            <div className="mt-auto border-t border-white/10 p-3">
              <p className="mb-2 text-[10px] font-bold uppercase text-white/40">
                문항 — {competencyLabel(paletteCode)}
              </p>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-white/40" />
                <input
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  placeholder="검색…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 text-xs text-white"
                />
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onLevelFilter(null)}
                  className={`rounded px-2 py-0.5 text-[10px] ${levelFilter === null ? "bg-gold text-slate-900" : "bg-white/10"}`}
                >
                  All
                </button>
                {[1, 2, 3, 4, 5].map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => onLevelFilter(levelFilter === lv ? null : lv)}
                    className={`rounded px-2 py-0.5 text-[10px] ${levelFilter === lv ? "bg-gold text-slate-900" : "bg-white/10"}`}
                  >
                    L{lv}
                  </button>
                ))}
              </div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {bankQuestions.map((q) => (
                  <BankQuestionCard
                    key={q.id}
                    q={q}
                    onAdd={() => onAddQuestion(paletteCode, q.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <main
            ref={canvasRef}
            className={`bg-gradient-to-br from-slate-50 to-white p-4 ${canvasOver ? "bg-accent/5" : ""}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" />
              <h2 className="font-semibold">나의 인터뷰 킷</h2>
            </div>
            {kitCompetencies.length === 0 ? (
              <div
                className={`flex min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center ${
                  canvasOver ? "border-accent bg-accent/10" : "border-card-border"
                }`}
              >
                <ChevronRight className="mb-2 h-8 w-8 rotate-180 text-muted/30" />
                <p className="font-medium">왼쪽 역량을 여기로 드래그</p>
                <p className="mt-1 text-sm text-muted">또는 + 버튼으로 추가</p>
              </div>
            ) : (
              <div className="space-y-4">
                {kitCompetencies.map((code) => {
                  const comp = compByCode.get(code);
                  const draft = drafts[code];
                  if (!comp || !draft) return null;
                  return (
                    <CompetencyKitPanel
                      key={code}
                      comp={comp}
                      draft={draft}
                      questionById={questionById}
                      active={activeCode === code}
                      limits={data.limits}
                      onSelect={() => {
                        onActiveCode(code);
                        onPaletteCode(code);
                      }}
                      onRemove={() => onRemoveCompetency(code)}
                      onRemoveQuestion={(qid) => onRemoveQuestion(code, qid)}
                    />
                  );
                })}
              </div>
            )}
          </main>

          <aside className="flex flex-col border-t border-card-border bg-card p-4 lg:border-l lg:border-t-0">
            <p className="text-[10px] font-bold uppercase text-gold">속성</p>
            <h3 className="font-semibold">{activeComp.nameKo}</h3>
            <div className="mt-3 flex-1 space-y-2 overflow-y-auto text-xs">
              {activeComp.platformRubricOptions.map((line) => (
                <label key={line} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={activeDraft.checkedPlatformRubric.has(line)}
                    onChange={(e) => {
                      const next = new Set(activeDraft.checkedPlatformRubric);
                      if (e.target.checked) next.add(line);
                      else next.delete(line);
                      onPatchDraft(activeCode, { checkedPlatformRubric: next });
                    }}
                  />
                  <span className="text-muted">{line}</span>
                </label>
              ))}
              {activeDraft.customRubricLines.map((line, i) => (
                <div key={i} className="flex gap-1">
                  <input
                    className="input flex-1 text-xs"
                    value={line}
                    onChange={(e) => {
                      const next = [...activeDraft.customRubricLines];
                      next[i] = e.target.value;
                      onPatchDraft(activeCode, { customRubricLines: next });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onPatchDraft(activeCode, {
                        customRubricLines: activeDraft.customRubricLines.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex items-center gap-1 text-accent"
                onClick={() =>
                  onPatchDraft(activeCode, {
                    customRubricLines: [...activeDraft.customRubricLines, ""],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" /> 기준 추가
              </button>
            </div>
            <div className="mt-3 space-y-2 border-t border-card-border pt-3">
              <button
                type="button"
                className="btn-primary w-full text-sm"
                disabled={activeDraft.saving}
                onClick={() => onSave(activeCode)}
              >
                {activeDraft.saving ? "저장 중…" : "저장"}
              </button>
              {activeDraft.message && (
                <p className="text-center text-xs text-muted">{activeDraft.message}</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay>
        {dragItem && (
          <div className="max-w-xs rounded-xl border border-gold/50 bg-card px-4 py-3 shadow-2xl">
            <p className="text-[10px] uppercase text-gold">
              {dragItem.kind === "comp" ? "역량" : `L${dragItem.level}`}
            </p>
            <p className="text-sm font-medium">{dragItem.label}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

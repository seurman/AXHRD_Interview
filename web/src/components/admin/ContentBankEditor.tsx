"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
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
import { GripVertical, Plus, Trash2 } from "lucide-react";

export type BankCompetency = {
  id: string;
  code: string;
  nameKo: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  questionCount: number;
};

export type BankQuestion = {
  id: string;
  externalId: string;
  competencyId: string;
  competencyCode: string;
  level: number;
  template: string;
  difficulty: number;
  discrimination: number;
  followUpHints: string[];
  rubricCriteria: string[];
  isActive: boolean;
  sortOrder: number;
};

type Props = {
  initialCompetencies: BankCompetency[];
  initialQuestions: BankQuestion[];
  canManagePermissions: boolean;
};

function SortableCompetencyRow({
  comp,
  selected,
  onSelect,
  onToggleActive,
}: {
  comp: BankCompetency;
  selected: boolean;
  onSelect: () => void;
  onToggleActive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `comp-${comp.id}`,
    data: { type: "competency", competency: comp },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-nowrap items-center gap-2 rounded-lg border px-2 py-2 text-sm ${
        selected ? "border-primary bg-primary/5" : "border-card-border bg-card"
      } ${!comp.isActive ? "opacity-50" : ""}`}
    >
      <button type="button" className="cursor-grab text-muted" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="font-medium text-foreground">{comp.nameKo}</p>
        <p className="truncate text-xs text-muted">{comp.code} · {comp.questionCount}문항</p>
      </button>
      <button
        type="button"
        onClick={onToggleActive}
        className="shrink-0 text-xs text-muted hover:text-primary"
        title={comp.isActive ? "비활성화" : "활성화"}
      >
        {comp.isActive ? "ON" : "OFF"}
      </button>
    </div>
  );
}

function QuestionCard({
  q,
  onEdit,
  dragHandle,
}: {
  q: BankQuestion;
  onEdit: () => void;
  dragHandle?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border border-card-border bg-card p-3 text-sm shadow-sm ${
        !q.isActive ? "opacity-50" : ""
      }`}
    >
      <div className="mb-2 flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{q.externalId}</p>
          <button type="button" onClick={onEdit} className="mt-1 text-left hover:text-primary">
            <p className="line-clamp-3 leading-relaxed [overflow-wrap:anywhere]">{q.template}</p>
          </button>
          {q.rubricCriteria.length > 0 && (
            <p className="mt-1 text-xs text-gold">루브릭 {q.rubricCriteria.length}개</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableQuestionCard({
  q,
  onEdit,
}: {
  q: BankQuestion;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `q-${q.id}`,
    data: { type: "question", question: q },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <QuestionCard
        q={q}
        onEdit={onEdit}
        dragHandle={
          <button type="button" className="cursor-grab text-muted" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 shrink-0" />
          </button>
        }
      />
    </div>
  );
}

export function ContentBankEditor({
  initialCompetencies,
  initialQuestions,
}: Props) {
  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedId, setSelectedId] = useState(initialCompetencies[0]?.id ?? "");
  const [editing, setEditing] = useState<BankQuestion | null>(null);
  const [activeDrag, setActiveDrag] = useState<BankQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const selected = competencies.find((c) => c.id === selectedId) ?? competencies[0];

  const questionsByLevel = useMemo(() => {
    const map: Record<number, BankQuestion[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    if (!selected) return map;
    for (const q of questions) {
      if (q.competencyId === selected.id && q.level >= 1 && q.level <= 5) {
        map[q.level].push(q);
      }
    }
    for (const lv of [1, 2, 3, 4, 5]) {
      map[lv].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [questions, selected]);

  const persistQuestionMoves = useCallback(
    async (nextQuestions: BankQuestion[]) => {
      const byComp = selected;
      if (!byComp) return;
      const moves = nextQuestions
        .filter((q) => q.competencyId === byComp.id)
        .flatMap((q) => {
          const levelQs = nextQuestions.filter(
            (x) => x.competencyId === byComp.id && x.level === q.level
          );
          levelQs.sort((a, b) => a.sortOrder - b.sortOrder);
          return levelQs.map((item, idx) => ({
            id: item.id,
            competencyId: item.competencyId,
            level: item.level,
            sortOrder: idx,
          }));
        });
      const unique = [...new Map(moves.map((m) => [m.id, m])).values()];
      await fetch("/api/admin/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moves: unique }),
      });
    },
    [selected]
  );

  const handleDragStart = (e: DragStartEvent) => {
    const q = e.active.data.current?.question as BankQuestion | undefined;
    if (q) setActiveDrag(q);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveDrag(null);
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;
    if (!activeId.startsWith("q-")) return;

    const qId = activeId.replace("q-", "");
    const dragged = questions.find((q) => q.id === qId);
    if (!dragged || !selected) return;

    setSaving(true);
    try {
      let next = [...questions];
      const qIndex = next.findIndex((q) => q.id === qId);

      if (overId.startsWith("comp-")) {
        const targetCompId = overId.replace("comp-", "");
        if (targetCompId === dragged.competencyId) return;
        next[qIndex] = { ...dragged, competencyId: targetCompId };
        setQuestions(next);
        await fetch("/api/admin/questions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moves: [{ id: qId, competencyId: targetCompId, level: dragged.level, sortOrder: 999 }],
          }),
        });
        return;
      }

      if (overId.startsWith("level-")) {
        const [, compId, levelStr] = overId.split("-");
        const level = parseInt(levelStr, 10);
        const targetCompId = competencies.find((c) => c.id === compId)?.id ?? selected.id;
        const levelQs = next.filter((q) => q.competencyId === targetCompId && q.level === level);
        next[qIndex] = { ...dragged, competencyId: targetCompId, level, sortOrder: levelQs.length };
        setQuestions(next);
        await persistQuestionMoves(next);
        return;
      }

      if (overId.startsWith("q-")) {
        const overQId = overId.replace("q-", "");
        const overQ = next.find((q) => q.id === overQId);
        if (!overQ || overQ.competencyId !== dragged.competencyId || overQ.level !== dragged.level) {
          if (overQ) {
            next[qIndex] = { ...dragged, competencyId: overQ.competencyId, level: overQ.level };
            const same = next.filter(
              (q) => q.competencyId === overQ.competencyId && q.level === overQ.level
            );
            const oldIdx = same.findIndex((q) => q.id === qId);
            const newIdx = same.findIndex((q) => q.id === overQId);
            if (oldIdx >= 0 && newIdx >= 0) {
              const reordered = arrayMove(same, oldIdx, newIdx);
              reordered.forEach((item, i) => {
                const gi = next.findIndex((q) => q.id === item.id);
                next[gi] = { ...item, sortOrder: i };
              });
            }
          }
        } else {
          const same = next.filter(
            (q) => q.competencyId === dragged.competencyId && q.level === dragged.level
          );
          const oldIdx = same.findIndex((q) => q.id === qId);
          const newIdx = same.findIndex((q) => q.id === overQId);
          const reordered = arrayMove(same, oldIdx, newIdx);
          reordered.forEach((item, i) => {
            const gi = next.findIndex((q) => q.id === item.id);
            next[gi] = { ...item, sortOrder: i };
          });
        }
        setQuestions(next);
        await persistQuestionMoves(next);
      }
    } finally {
      setSaving(false);
    }
  };

  const reorderCompetencies = async (activeId: string, overId: string) => {
    const oldIdx = competencies.findIndex((c) => `comp-${c.id}` === activeId);
    const newIdx = competencies.findIndex((c) => `comp-${c.id}` === overId);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(competencies, oldIdx, newIdx).map((c, i) => ({
      ...c,
      sortOrder: i,
    }));
    setCompetencies(reordered);
    await fetch("/api/admin/competencies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: reordered.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
      }),
    });
  };

  const onCompetencyDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;
    if (activeId.startsWith("comp-") && overId.startsWith("comp-")) {
      reorderCompetencies(activeId, overId);
    }
  };

  const addCompetency = async () => {
    const code = prompt("역량 코드 (예: TEAMWORK)");
    if (!code?.trim()) return;
    const nameKo = prompt("한글 역량명");
    if (!nameKo?.trim()) return;
    const res = await fetch("/api/admin/competencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim(), nameKo: nameKo.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "추가 실패");
      return;
    }
    const c = data.competency;
    setCompetencies((prev) => [
      ...prev,
      { ...c, questionCount: 0 },
    ]);
    setSelectedId(c.id);
  };

  const toggleCompetencyActive = async (comp: BankCompetency) => {
    const res = await fetch(`/api/admin/competencies/${comp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !comp.isActive }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setCompetencies((prev) =>
      prev.map((c) => (c.id === comp.id ? { ...c, isActive: data.competency.isActive } : c))
    );
  };

  const addQuestion = async (level: number) => {
    if (!selected) return;
    const template = prompt(`L${level} 질문 텍스트`);
    if (!template?.trim()) return;
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competencyId: selected.id, level, template: template.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "추가 실패");
      return;
    }
    const q = data.question;
    setQuestions((prev) => [
      ...prev,
      {
        id: q.id,
        externalId: q.externalId,
        competencyId: q.competencyId,
        competencyCode: selected.code,
        level: q.level,
        template: q.template,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        followUpHints: q.followUpHints ?? [],
        rubricCriteria: q.rubricCriteria ?? [],
        isActive: q.isActive,
        sortOrder: q.sortOrder,
      },
    ]);
    setCompetencies((prev) =>
      prev.map((c) =>
        c.id === selected.id ? { ...c, questionCount: c.questionCount + 1 } : c
      )
    );
  };

  const saveQuestion = async (q: BankQuestion) => {
    const res = await fetch(`/api/admin/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(q),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "저장 실패");
      return;
    }
    const updated = data.question;
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === q.id
          ? {
              ...item,
              template: updated.template,
              level: updated.level,
              difficulty: updated.difficulty,
              discrimination: updated.discrimination,
              followUpHints: updated.followUpHints,
              rubricCriteria: updated.rubricCriteria,
              isActive: updated.isActive,
            }
          : item
      )
    );
    setEditing(null);
  };

  const deleteQuestion = async (q: BankQuestion) => {
    if (!confirm("이 문항을 삭제(또는 비활성화)할까요?")) return;
    const res = await fetch(`/api/admin/questions/${q.id}`, { method: "DELETE" });
    if (!res.ok) return;
    const data = await res.json();
    if (data.softDeleted) {
      setQuestions((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, isActive: false } : item))
      );
    } else {
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
      setCompetencies((prev) =>
        prev.map((c) =>
          c.id === q.competencyId ? { ...c, questionCount: Math.max(0, c.questionCount - 1) } : c
        )
      );
    }
    setEditing(null);
  };

  useEffect(() => {
    if (!selectedId && competencies[0]) setSelectedId(competencies[0].id);
  }, [competencies, selectedId]);

  return (
    <div className="space-y-4">
      {saving && (
        <p className="text-xs text-muted">변경 사항 저장 중…</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={(e) => {
          const id = String(e.active.id);
          if (id.startsWith("comp-")) onCompetencyDragEnd(e);
          else handleDragEnd(e);
        }}
      >
        <div className="grid gap-6 lg:grid-cols-12">
          {/* 역량 사이드바 — HireVue Builder의 competency 패널 */}
          <aside className="space-y-3 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">역량</h2>
              <button type="button" onClick={addCompetency} className="btn-primary px-2 py-1 text-xs">
                <Plus className="mr-1 inline h-3 w-3" />
                추가
              </button>
            </div>
            <p className="text-xs text-muted">
              드래그로 순서 변경 · 문항을 역량 위에 놓으면 이동
            </p>
            <SortableContext
              items={competencies.map((c) => `comp-${c.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {competencies.map((c) => (
                  <SortableCompetencyRow
                    key={c.id}
                    comp={c}
                    selected={selected?.id === c.id}
                    onSelect={() => setSelectedId(c.id)}
                    onToggleActive={() => toggleCompetencyActive(c)}
                  />
                ))}
              </div>
            </SortableContext>
          </aside>

          {/* 레벨별 칸반 — 문항 드래그 앤 드롭 */}
          <section className="lg:col-span-9">
            {selected ? (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-foreground">{selected.nameKo}</h2>
                  <p className="text-sm text-muted">{selected.code}</p>
                </div>
                <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 md:mx-0 md:overflow-visible md:px-0">
                  <div className="flex w-max gap-3 md:w-full md:grid md:grid-cols-5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="w-64 shrink-0 md:w-auto">
                    <LevelColumn
                      level={level}
                      competencyId={selected.id}
                      questions={questionsByLevel[level]}
                      onAdd={() => addQuestion(level)}
                      onEdit={setEditing}
                    />
                    </div>
                  ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">역량을 추가해 주세요.</p>
            )}
          </section>
        </div>

        <DragOverlay>
          {activeDrag ? (
            <QuestionCard q={activeDrag} onEdit={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {editing && (
        <QuestionEditModal
          question={editing}
          onClose={() => setEditing(null)}
          onSave={saveQuestion}
          onDelete={deleteQuestion}
        />
      )}
    </div>
  );
}

function LevelColumn({
  level,
  competencyId,
  questions,
  onAdd,
  onEdit,
}: {
  level: number;
  competencyId: string;
  questions: BankQuestion[];
  onAdd: () => void;
  onEdit: (q: BankQuestion) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `level-${competencyId}-${level}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[240px] flex-col rounded-xl border p-2 md:min-h-[280px] ${
        isOver ? "border-primary bg-primary/5" : "border-card-border bg-background"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">L{level}</span>
        <button type="button" onClick={onAdd} className="text-muted hover:text-primary">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <SortableContext items={questions.map((q) => `q-${q.id}`)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {questions.map((q) => (
            <SortableQuestionCard key={q.id} q={q} onEdit={() => onEdit(q)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function QuestionEditModal({
  question,
  onClose,
  onSave,
  onDelete,
}: {
  question: BankQuestion;
  onClose: () => void;
  onSave: (q: BankQuestion) => void;
  onDelete: (q: BankQuestion) => void;
}) {
  const [draft, setDraft] = useState(question);
  const [rubricText, setRubricText] = useState(question.rubricCriteria.join("\n"));
  const [hintsText, setHintsText] = useState(question.followUpHints.join("\n"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-luxe max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h3 className="text-lg font-bold">문항 · 루브릭 편집</h3>
        <p className="text-xs text-muted">{draft.externalId}</p>

        <label className="mt-4 block text-sm font-medium">질문 텍스트</label>
        <textarea
          className="input-luxe mt-1 min-h-[100px] w-full"
          value={draft.template}
          onChange={(e) => setDraft({ ...draft, template: e.target.value })}
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">레벨</label>
            <select
              className="input-luxe mt-1 w-full"
              value={draft.level}
              onChange={(e) => setDraft({ ...draft, level: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>L{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">IRT 난이도(b)</label>
            <input
              type="number"
              step="0.1"
              className="input-luxe mt-1 w-full"
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">변별도(a)</label>
            <input
              type="number"
              step="0.05"
              className="input-luxe mt-1 w-full"
              value={draft.discrimination}
              onChange={(e) => setDraft({ ...draft, discrimination: Number(e.target.value) })}
            />
          </div>
        </div>

        <label className="mt-4 block text-sm font-medium">
          채점 루브릭 (한 줄에 기준 1개 — HireVue 평가 가이드 방식)
        </label>
        <textarea
          className="input-luxe mt-1 min-h-[120px] w-full font-mono text-xs"
          placeholder="상황·배경을 구체적으로 설명했는가&#10;본인의 역할과 행동을 밝혔는가&#10;정량적 결과를 제시했는가"
          value={rubricText}
          onChange={(e) => setRubricText(e.target.value)}
        />

        <label className="mt-4 block text-sm font-medium">꼬리질문 힌트 (한 줄에 1개)</label>
        <textarea
          className="input-luxe mt-1 min-h-[60px] w-full text-xs"
          value={hintsText}
          onChange={(e) => setHintsText(e.target.value)}
        />

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
          />
          면접에 사용 (활성)
        </label>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary px-4 py-2"
            onClick={() =>
              onSave({
                ...draft,
                rubricCriteria: rubricText.split("\n").map((s) => s.trim()).filter(Boolean),
                followUpHints: hintsText.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          >
            저장
          </button>
          <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="ml-auto flex items-center gap-1 text-sm text-red-600"
            onClick={() => onDelete(draft)}
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

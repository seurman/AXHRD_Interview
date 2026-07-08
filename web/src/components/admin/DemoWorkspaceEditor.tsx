"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  CompetencyRubricPanel,
  mapCompetencyRubrics,
  type RubricCompetency,
} from "@/components/admin/CompetencyRubricPanel";
import type { RubricByLevel } from "@/lib/competency/rubric";
import type { DemoCompetencyDto, DemoQuestionDto } from "@/lib/demo/workspace";

type Tab = "competencies" | "questions" | "rubrics";

type Props = {
  workspaceId: string;
  workspaceSlug: string;
  initialCompetencies: DemoCompetencyDto[];
  initialQuestions: DemoQuestionDto[];
};

const LEVELS = [1, 2, 3, 4, 5] as const;

export function DemoWorkspaceEditor({
  workspaceId,
  workspaceSlug,
  initialCompetencies,
  initialQuestions,
}: Props) {
  const [tab, setTab] = useState<Tab>("competencies");
  const [competencies, setCompetencies] = useState(initialCompetencies);
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedCompId, setSelectedCompId] = useState(initialCompetencies[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const base = `/api/admin/demo/workspaces/${workspaceId}`;
  const selectedComp = competencies.find((c) => c.id === selectedCompId);

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
    [competencies]
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

  const addCompetency = async () => {
    const code = prompt("역량 코드 (예: COMMUNICATION)")?.trim().toUpperCase();
    if (!code) return;
    const nameKo = prompt("한글 역량명")?.trim();
    if (!nameKo) return;
    setBusy(true);
    try {
      const res = await fetch(`${base}/competencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, nameKo }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "추가 실패");
      }
      await refresh();
      setTab("questions");
    } catch (e) {
      alert(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setBusy(false);
    }
  };

  const toggleCompActive = async (comp: DemoCompetencyDto) => {
    setBusy(true);
    try {
      await fetch(`${base}/competencies/${comp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !comp.isActive }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const removeCompetency = async (comp: DemoCompetencyDto) => {
    if (!confirm(`「${comp.nameKo}」 역량과 문항을 삭제할까요?`)) return;
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

  const cloneFromProduction = async () => {
    if (!confirm("운영 문항 뱅크 내용으로 덮어쓸까요? 기존 데모 데이터는 삭제됩니다.")) return;
    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cloneFromProduction" }),
      });
      if (!res.ok) throw new Error("복제 실패");
      const data = await res.json();
      setCompetencies(data.competencies);
      setQuestions(data.questions);
      setSelectedCompId(data.competencies[0]?.id ?? "");
    } catch (e) {
      alert(e instanceof Error ? e.message : "복제 실패");
    } finally {
      setBusy(false);
    }
  };

  const updateRubric = async (compId: string, rubricByLevel: RubricByLevel) => {
    await fetch(`${base}/competencies/${compId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rubricByLevel }),
    });
    setCompetencies((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, rubricByLevel } : c))
    );
  };

  const applyRubricToQuestions = async (competencyId: string, level: number, criteria: string[]) => {
    const targets = questions.filter((q) => q.competencyId === competencyId && q.level === level);
    await Promise.all(
      targets.map((q) =>
        fetch(`${base}/questions/${q.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rubricCriteria: criteria }),
        })
      )
    );
    setQuestions((prev) =>
      prev.map((q) =>
        q.competencyId === competencyId && q.level === level
          ? { ...q, rubricCriteria: criteria }
          : q
      )
    );
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "competencies", label: "역량" },
    { id: "questions", label: "질문 리스트" },
    { id: "rubrics", label: "루브릭" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                tab === t.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-card-border text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={cloneFromProduction}
            disabled={busy}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            운영 뱅크에서 복제
          </button>
          <a
            href={`/demo/${workspaceSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center gap-1 px-3 py-1.5 text-xs"
          >
            데모 미리보기 <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {tab === "competencies" && (
        <div className="space-y-3 rounded-xl border border-card-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">역량 목록</h2>
            <button
              type="button"
              onClick={addCompetency}
              disabled={busy}
              className="btn-primary inline-flex items-center gap-1 px-3 py-1 text-xs"
            >
              <Plus className="h-3 w-3" /> 역량 추가
            </button>
          </div>
          {competencies.length === 0 ? (
            <p className="text-sm text-muted">역량을 추가하거나 운영 뱅크에서 복제해 주세요.</p>
          ) : (
            <ul className="space-y-2">
              {competencies.map((c, idx) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    !c.isActive ? "opacity-50" : ""
                  } border-card-border`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button type="button" onClick={() => moveCompetency(c.id, -1)} disabled={idx === 0}>
                      <ChevronUp className="h-4 w-4 text-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCompetency(c.id, 1)}
                      disabled={idx === competencies.length - 1}
                    >
                      <ChevronDown className="h-4 w-4 text-muted" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.nameKo}</p>
                    <p className="text-xs text-muted">
                      {c.code} · {c.questionCount}문항
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCompActive(c)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    {c.isActive ? "비활성" : "활성"}
                  </button>
                  <button type="button" onClick={() => removeCompetency(c)} className="text-muted hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "questions" && (
        <div className="space-y-4">
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
            <p className="text-sm text-muted">역량을 먼저 선택해 주세요.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              {LEVELS.map((lv) => (
                <div key={lv} className="rounded-xl border border-card-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gold">L{lv}</span>
                    <button
                      type="button"
                      onClick={() => addQuestion(lv)}
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
                                x.id === q.id ? { ...x, template: e.target.value } : x
                              )
                            )
                          }
                          onBlur={() => updateQuestion(q, { template: q.template })}
                        />
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => moveQuestion(q, -1)} disabled={qIdx === 0}>
                              <ChevronUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(q, 1)}
                              disabled={qIdx === arr.length - 1}
                            >
                              <ChevronDown className="h-3 w-3" />
                            </button>
                          </div>
                          <button type="button" onClick={() => removeQuestion(q)}>
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

      {tab === "rubrics" && (
        <CompetencyRubricPanel
          competencies={rubricCompetencies}
          onUpdate={updateRubric}
          onApplyToQuestions={applyRubricToQuestions}
          onImportComplete={refresh}
        />
      )}
    </div>
  );
}

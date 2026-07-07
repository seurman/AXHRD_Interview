"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InterviewKitWorkspace } from "@/components/org/InterviewKitWorkspace";
import {
  type ApiCompetency,
  type ApiKit,
  type ApiPayload,
  type ApiQuestion,
  type CompetencyDraft,
} from "@/components/org/kit-workspace-types";

function initDraft(comp: ApiCompetency, kit: ApiKit | undefined): CompetencyDraft {
  const platform = comp.platformRubricOptions;
  if (!kit || kit.selectedQuestionIds.length === 0) {
    return {
      selectedIds: [],
      checkedPlatformRubric: new Set(platform),
      customRubricLines: [],
      dirty: false,
      saving: false,
      message: null,
    };
  }
  const platformSet = new Set(platform);
  const fromKit = kit.customRubricCriteria;
  const checkedPlatform = new Set<string>();
  const customLines: string[] = [];
  for (const line of fromKit) {
    if (platformSet.has(line)) checkedPlatform.add(line);
    else customLines.push(line);
  }
  if (checkedPlatform.size === 0 && platform.length > 0) {
    for (const p of platform) checkedPlatform.add(p);
  }
  return {
    selectedIds: [...kit.selectedQuestionIds],
    checkedPlatformRubric: checkedPlatform,
    customRubricLines: customLines,
    dirty: false,
    saving: false,
    message: null,
  };
}

function buildRubricCriteria(draft: CompetencyDraft, platformOrder: string[]): string[] {
  const fromPlatform = platformOrder.filter((line) => draft.checkedPlatformRubric.has(line));
  const custom = draft.customRubricLines.map((s) => s.trim()).filter(Boolean);
  return [...fromPlatform, ...custom];
}

function kitCompetenciesFromPayload(payload: ApiPayload): string[] {
  const withConfig = new Set(
    payload.kits
      .filter(
        (k) =>
          k.selectedQuestionIds.length > 0 ||
          (k.customRubricCriteria && k.customRubricCriteria.length > 0)
      )
      .map((k) => k.competency)
  );
  return payload.competencies.map((c) => c.code).filter((code) => withConfig.has(code));
}

export function InterviewKitBuilder() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [kitCompetencies, setKitCompetencies] = useState<string[]>([]);
  const [paletteCode, setPaletteCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [drafts, setDrafts] = useState<Record<string, CompetencyDraft>>({});
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<{
    kind: "comp" | "question";
    label: string;
    level?: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org/interview-kit");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "불러오기에 실패했습니다.");
        return;
      }
      const payload = json as ApiPayload;
      setData(payload);
      const kitMap = new Map(payload.kits.map((k) => [k.competency, k]));
      const nextDrafts: Record<string, CompetencyDraft> = {};
      for (const c of payload.competencies) {
        nextDrafts[c.code] = initDraft(c, kitMap.get(c.code));
      }
      setDrafts(nextDrafts);
      const inKit = kitCompetenciesFromPayload(payload);
      setKitCompetencies(inKit);
      const first = payload.competencies[0]?.code ?? "";
      setPaletteCode(first);
      setActiveCode(inKit[0] ?? first);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const questionById = useMemo(() => {
    const map = new Map<string, ApiQuestion>();
    if (!data) return map;
    for (const q of data.questions) map.set(q.id, q);
    return map;
  }, [data]);

  const questionsByComp = useMemo(() => {
    const map = new Map<string, ApiQuestion[]>();
    if (!data) return map;
    for (const q of data.questions) {
      const list = map.get(q.competencyCode) ?? [];
      list.push(q);
      map.set(q.competencyCode, list);
    }
    return map;
  }, [data]);

  const compByCode = useMemo(() => {
    const map = new Map<string, ApiCompetency>();
    if (!data) return map;
    for (const c of data.competencies) map.set(c.code, c);
    return map;
  }, [data]);

  function patchDraft(code: string, patch: Partial<CompetencyDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [code]: { ...prev[code], ...patch, dirty: true, message: null },
    }));
  }

  function addCompetencyToKit(code: string) {
    if (kitCompetencies.includes(code)) return;
    setKitCompetencies((prev) => [...prev, code]);
    setActiveCode(code);
    setPaletteCode(code);
  }

  async function resetCompetency(code: string) {
    patchDraft(code, { saving: true, message: null });
    try {
      const res = await fetch(`/api/org/interview-kit?competency=${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        patchDraft(code, { saving: false, message: json.error ?? "초기화 실패" });
        return;
      }
      const comp = compByCode.get(code);
      if (comp) {
        setDrafts((prev) => ({
          ...prev,
          [code]: { ...initDraft(comp, undefined), message: "플랫폼 기본값으로 되돌렸습니다." },
        }));
      }
      setData((prev) =>
        prev ? { ...prev, kits: prev.kits.filter((k) => k.competency !== code) } : prev
      );
    } catch {
      patchDraft(code, { saving: false, message: "네트워크 오류" });
    }
  }

  function removeCompetencyFromKit(code: string) {
    if (!confirm("이 역량을 킷에서 제거할까요?")) return;
    void resetCompetency(code);
    setKitCompetencies((prev) => prev.filter((c) => c !== code));
    if (activeCode === code) {
      const next = kitCompetencies.filter((c) => c !== code);
      setActiveCode(next[0] ?? paletteCode);
    }
  }

  function addQuestionToKit(code: string, questionId: string) {
    const q = questionById.get(questionId);
    if (!q || !q.isActive || q.competencyCode !== code) return;
    const draft = drafts[code];
    if (!draft || draft.selectedIds.includes(questionId)) return;
    if (!kitCompetencies.includes(code)) addCompetencyToKit(code);
    patchDraft(code, { selectedIds: [...draft.selectedIds, questionId] });
    setActiveCode(code);
    setPaletteCode(code);
  }

  async function saveCompetency(code: string) {
    const comp = compByCode.get(code);
    const draft = drafts[code];
    if (!comp || !draft || !data) return;
    if (draft.selectedIds.length > 0 && draft.selectedIds.length < data.limits.min) {
      patchDraft(code, {
        message: `최소 ${data.limits.min}개 이상 선택해야 저장할 수 있습니다.`,
      });
      return;
    }
    patchDraft(code, { saving: true, message: null });
    try {
      const res = await fetch("/api/org/interview-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competency: code,
          selectedQuestionIds: draft.selectedIds,
          customRubricCriteria: buildRubricCriteria(draft, comp.platformRubricOptions),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        patchDraft(code, { saving: false, message: json.error ?? "저장 실패" });
        return;
      }
      setData((prev) => {
        if (!prev) return prev;
        const others = prev.kits.filter((k) => k.competency !== code);
        return { ...prev, kits: [...others, json.kit as ApiKit] };
      });
      setDrafts((prev) => ({
        ...prev,
        [code]: { ...prev[code], dirty: false, saving: false, message: "저장되었습니다." },
      }));
    } catch {
      patchDraft(code, { saving: false, message: "네트워크 오류" });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-card-border">
        <p className="animate-pulse text-sm text-muted">워크스페이스 준비 중…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-luxe space-y-4 p-6">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/org/saas/settings" className="text-sm text-accent hover:underline">
          기관 설정으로
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <InterviewKitWorkspace
      data={data}
      kitCompetencies={kitCompetencies}
      paletteCode={paletteCode}
      activeCode={activeCode}
      drafts={drafts}
      search={search}
      levelFilter={levelFilter}
      dragItem={dragItem}
      questionById={questionById}
      questionsByComp={questionsByComp}
      compByCode={compByCode}
      onPaletteCode={setPaletteCode}
      onActiveCode={setActiveCode}
      onSearch={setSearch}
      onLevelFilter={setLevelFilter}
      onDragItem={setDragItem}
      onAddCompetency={addCompetencyToKit}
      onRemoveCompetency={removeCompetencyFromKit}
      onAddQuestion={addQuestionToKit}
      onRemoveQuestion={(code, qid) => {
        const draft = drafts[code];
        if (!draft) return;
        patchDraft(code, { selectedIds: draft.selectedIds.filter((id) => id !== qid) });
      }}
      onReorderQuestions={(code, ids) => patchDraft(code, { selectedIds: ids })}
      onPatchDraft={patchDraft}
      onSave={(code) => void saveCompetency(code)}
    />
  );
}

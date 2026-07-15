"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { InterviewKitWorkspace } from "@/components/org/InterviewKitWorkspace";
import {
  KIT_RUBRIC_LEVELS,
  type ApiCompetency,
  type ApiKit,
  type ApiPayload,
  type ApiQuestion,
  type CompetencyDraft,
  type LevelRubricDraft,
} from "@/components/org/kit-workspace-types";
import {
  orgKitRubricForLevel,
  platformRubricForLevel,
} from "@/lib/org/kit-rubric";
import type { RubricByLevel } from "@/lib/competency/rubric";
import type { CompetencyGapRecommendationResult } from "@/lib/diagnostic/gap-recommendations";

function kitApiBase(organizationId?: string) {
  const base = "/api/org/interview-kit";
  if (!organizationId) return base;
  return `${base}?organizationId=${encodeURIComponent(organizationId)}`;
}

function gapRecommendationsUrl(organizationId?: string) {
  const base = "/api/org/interview-kit/gap-recommendations";
  if (!organizationId) return base;
  return `${base}?organizationId=${encodeURIComponent(organizationId)}`;
}


function platformLinesForLevel(comp: ApiCompetency, level: number): string[] {
  return platformRubricForLevel(comp.code, comp.rubricByLevel, level);
}

function defaultLevelRubric(comp: ApiCompetency, level: number): LevelRubricDraft {
  const platform = platformLinesForLevel(comp, level);
  return { checkedPlatform: new Set(platform), customLines: [] };
}

function initLevelRubrics(comp: ApiCompetency, kit: ApiKit | undefined): Record<string, LevelRubricDraft> {
  const out: Record<string, LevelRubricDraft> = {};
  for (const lv of KIT_RUBRIC_LEVELS) {
    const key = String(lv);
    const platform = platformLinesForLevel(comp, lv);
    const platformSet = new Set(platform);
    const kitLines = kit ? orgKitRubricForLevel(kit.customRubricByLevel, lv) : [];
    if (kitLines.length === 0) {
      out[key] = { checkedPlatform: new Set(platform), customLines: [] };
      continue;
    }
    const checkedPlatform = new Set<string>();
    const customLines: string[] = [];
    for (const line of kitLines) {
      if (platformSet.has(line)) checkedPlatform.add(line);
      else customLines.push(line);
    }
    if (checkedPlatform.size === 0 && platform.length > 0) {
      for (const p of platform) checkedPlatform.add(p);
    }
    out[key] = { checkedPlatform, customLines };
  }
  return out;
}

function initDraft(comp: ApiCompetency, kit: ApiKit | undefined): CompetencyDraft {
  const hasKit =
    kit &&
    (kit.selectedQuestionIds.length > 0 || Object.keys(kit.customRubricByLevel).length > 0);
  if (!hasKit) {
    const rubricByLevel: Record<string, LevelRubricDraft> = {};
    for (const lv of KIT_RUBRIC_LEVELS) {
      rubricByLevel[String(lv)] = defaultLevelRubric(comp, lv);
    }
    return {
      selectedIds: [],
      rubricLevel: 3,
      rubricByLevel,
      dirty: false,
      saving: false,
      message: null,
    };
  }
  return {
    selectedIds: [...(kit?.selectedQuestionIds ?? [])],
    rubricLevel: 3,
    rubricByLevel: initLevelRubrics(comp, kit),
    dirty: false,
    saving: false,
    message: null,
  };
}

function buildCustomRubricByLevel(draft: CompetencyDraft, comp: ApiCompetency): RubricByLevel {
  const out: RubricByLevel = {};
  for (const lv of KIT_RUBRIC_LEVELS) {
    const key = String(lv);
    const state = draft.rubricByLevel[key];
    if (!state) continue;
    const platformOrder = platformLinesForLevel(comp, lv);
    const fromPlatform = platformOrder.filter((line) => state.checkedPlatform.has(line));
    const custom = state.customLines.map((s) => s.trim()).filter(Boolean);
    const criteria = [...fromPlatform, ...custom];
    if (criteria.length > 0) out[key] = criteria;
  }
  return out;
}

function kitCompetenciesFromPayload(payload: ApiPayload): string[] {
  const withConfig = new Set(
    payload.kits
      .filter(
        (k) =>
          k.selectedQuestionIds.length > 0 ||
          Object.keys(k.customRubricByLevel).length > 0
      )
      .map((k) => k.competency)
  );
  return payload.competencies.map((c) => c.code).filter((code) => withConfig.has(code));
}

type Props = {
  organizationId?: string;
  backHref?: string;
  backLabel?: string;
};

export function InterviewKitBuilder({
  organizationId,
  backHref = "/org/settings",
  backLabel = "기관 설정으로",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [kitCompetencies, setKitCompetencies] = useState<string[]>([]);
  const [paletteCode, setPaletteCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [drafts, setDrafts] = useState<Record<string, CompetencyDraft>>({});
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [gapRecs, setGapRecs] = useState<CompetencyGapRecommendationResult | null>(null);
  const [gapUnavailable, setGapUnavailable] = useState(false);

  const apiBase = kitApiBase(organizationId);
  const gapUrl = gapRecommendationsUrl(organizationId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGapRecs(null);
    setGapUnavailable(false);
    try {
      const res = await fetch(apiBase);
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

      try {
        const gapRes = await fetch(gapUrl);
        if (gapRes.status === 404) {
          setGapUnavailable(true);
        } else if (gapRes.ok) {
          setGapRecs((await gapRes.json()) as CompetencyGapRecommendationResult);
        }
      } catch {
        /* Gap-to-Hire는 선택 기능 — 킷 편집 자체는 유지 */
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, gapUrl]);

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
      const url = `${apiBase}${apiBase.includes("?") ? "&" : "?"}competency=${encodeURIComponent(code)}`;
      const res = await fetch(url, { method: "DELETE" });
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

  function reorderQuestionsInKit(code: string, questionIds: string[]) {
    patchDraft(code, { selectedIds: questionIds });
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
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competency: code,
          selectedQuestionIds: draft.selectedIds,
          customRubricByLevel: buildCustomRubricByLevel(draft, comp),
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
        <Link href={backHref} className="text-sm text-accent hover:underline">
          {backLabel}
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
      questionById={questionById}
      questionsByComp={questionsByComp}
      compByCode={compByCode}
      onPaletteCode={setPaletteCode}
      onActiveCode={setActiveCode}
      onSearch={setSearch}
      onLevelFilter={setLevelFilter}
      onAddCompetency={addCompetencyToKit}
      onRemoveCompetency={removeCompetencyFromKit}
      onAddQuestion={addQuestionToKit}
      onRemoveQuestion={(code, qid) => {
        const draft = drafts[code];
        if (!draft) return;
        patchDraft(code, { selectedIds: draft.selectedIds.filter((id) => id !== qid) });
      }}
      onReorderQuestions={reorderQuestionsInKit}
      onPatchDraft={patchDraft}
      onSave={(code) => void saveCompetency(code)}
      gapRecommendations={gapUnavailable ? null : gapRecs}
    />
  );
}

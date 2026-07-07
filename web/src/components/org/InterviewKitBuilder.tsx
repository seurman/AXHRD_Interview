"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { MotionReorderList } from "@/components/org/MotionReorderList";
import { competencyLabel } from "@/lib/labels";

type ApiQuestion = {
  id: string;
  externalId: string;
  competencyCode: string;
  level: number;
  template: string;
  isActive: boolean;
};

type ApiCompetency = {
  code: string;
  nameKo: string;
  description: string | null;
  platformRubricOptions: string[];
};

type ApiKit = {
  competency: string;
  selectedQuestionIds: string[];
  customRubricCriteria: string[];
  updatedAt: string;
};

type ApiPayload = {
  limits: { min: number; recommended: number };
  competencies: ApiCompetency[];
  questions: ApiQuestion[];
  kits: ApiKit[];
};

type CompetencyDraft = {
  selectedIds: string[];
  checkedPlatformRubric: Set<string>;
  customRubricLines: string[];
  dirty: boolean;
  saving: boolean;
  message: string | null;
};

function previewText(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function initDraft(
  comp: ApiCompetency,
  kit: ApiKit | undefined
): CompetencyDraft {
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
  for (const p of platform) {
    if (!checkedPlatform.has(p) && !fromKit.length) checkedPlatform.add(p);
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

export function InterviewKitBuilder() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [activeCode, setActiveCode] = useState<string>("COMMUNICATION");
  const [drafts, setDrafts] = useState<Record<string, CompetencyDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/org/interview-kit");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "불러오기에 실패했습니다.");
        setData(null);
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
      if (payload.competencies[0]) setActiveCode(payload.competencies[0].code);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeComp = useMemo(
    () => data?.competencies.find((c) => c.code === activeCode),
    [data, activeCode]
  );
  const activeDraft = drafts[activeCode];
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

  const questionById = useMemo(() => {
    const map = new Map<string, ApiQuestion>();
    if (!data) return map;
    for (const q of data.questions) map.set(q.id, q);
    return map;
  }, [data]);

  const savedKit = data?.kits.find((k) => k.competency === activeCode);
  const usingPlatformDefault =
    !savedKit || savedKit.selectedQuestionIds.length === 0;

  function patchDraft(code: string, patch: Partial<CompetencyDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [code]: { ...prev[code], ...patch, dirty: true, message: null },
    }));
  }

  function toggleQuestion(id: string, checked: boolean) {
    const draft = drafts[activeCode];
    if (!draft) return;
    let next = [...draft.selectedIds];
    if (checked) {
      if (!next.includes(id)) next.push(id);
    } else {
      next = next.filter((x) => x !== id);
    }
    patchDraft(activeCode, { selectedIds: next });
  }

  async function saveCompetency(code: string) {
    const comp = data?.competencies.find((c) => c.code === code);
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
        return {
          ...prev,
          kits: [...others, json.kit as ApiKit],
        };
      });
      setDrafts((prev) => ({
        ...prev,
        [code]: { ...prev[code], dirty: false, saving: false, message: "저장되었습니다." },
      }));
    } catch {
      patchDraft(code, { saving: false, message: "네트워크 오류" });
    }
  }

  async function resetCompetency(code: string) {
    if (!confirm("이 역량 설정을 삭제하고 플랫폼 기본값으로 되돌릴까요?")) return;
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
      const comp = data?.competencies.find((c) => c.code === code);
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

  if (loading) {
    return <p className="text-sm text-muted">인터뷰 킷 데이터를 불러오는 중…</p>;
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

  if (!data || !activeComp || !activeDraft) return null;

  const bankQuestions = questionsByComp.get(activeCode) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-card-border pb-2">
        {data.competencies.map((c) => {
          const kit = data.kits.find((k) => k.competency === c.code);
          const configured = kit && kit.selectedQuestionIds.length > 0;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setActiveCode(c.code)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeCode === c.code
                  ? "bg-accent text-white"
                  : "bg-background text-muted hover:text-foreground"
              }`}
            >
              {competencyLabel(c.code)}
              {!configured && (
                <span className="ml-1 text-xs opacity-70">(기본)</span>
              )}
            </button>
          );
        })}
      </div>

      {usingPlatformDefault ? (
        <p className="rounded-lg bg-background px-4 py-3 text-sm text-muted">
          이 역량은 <strong className="text-foreground">플랫폼 기본값 사용 중</strong>입니다.
          문항·루브릭을 저장하지 않아도 면접은 전체 문항 뱅크와 기본 루브릭으로 정상
          진행됩니다.
        </p>
      ) : (
        <p className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-foreground">
          기관 맞춤 킷 적용 중 — 선택한 {savedKit!.selectedQuestionIds.length}개 문항 풀과
          커스텀 루브릭이 소속 학생 면접에 사용됩니다.
          {savedKit!.updatedAt && (
            <span className="ml-2 text-xs text-muted">
              (마지막 저장: {new Date(savedKit!.updatedAt).toLocaleString("ko-KR")})
            </span>
          )}
        </p>
      )}

      <p className="text-xs text-muted">
        최소 <strong>{data.limits.min}개</strong> 이상, 권장{" "}
        <strong>{data.limits.recommended}개</strong> 이상 문항을 선택하면 적응형 난이도(IRT)
        검사가 각 레벨에서 충분한 후보 풀을 확보할 수 있습니다. 난이도·변별도 파라미터는
        플랫폼이 관리하며 기관에서 수정할 수 없습니다.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-luxe p-5">
          <h2 className="mb-3 font-semibold text-foreground">플랫폼 문항 뱅크</h2>
          <p className="mb-4 text-xs text-muted">
            {activeComp.nameKo} — 콘텐츠 관리자가 큐레이션한 문항 ({bankQuestions.length}개)
          </p>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {bankQuestions.map((q) => {
              const checked = activeDraft.selectedIds.includes(q.id);
              const disabled = !q.isActive;
              return (
                <label
                  key={q.id}
                  className={`flex gap-3 rounded-lg border p-3 text-sm transition ${
                    disabled
                      ? "cursor-not-allowed border-card-border/60 opacity-50"
                      : checked
                        ? "cursor-pointer border-accent/40 bg-accent/5"
                        : "cursor-pointer border-card-border hover:border-accent/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => toggleQuestion(q.id, e.target.checked)}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gold">
                      L{q.level}
                      {!q.isActive && (
                        <span className="ml-1 text-muted">(비활성)</span>
                      )}
                    </span>
                    <p className="mt-0.5 text-foreground">{previewText(q.template)}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <section className="card-luxe p-5">
          <h2 className="mb-3 font-semibold text-foreground">
            선택된 문항 ({activeDraft.selectedIds.length}개)
          </h2>
          <p className="mb-4 text-xs text-muted">드래그하여 출제 우선 순서를 정하세요.</p>
          <MotionReorderList
            ids={activeDraft.selectedIds}
            onReorder={(next) => patchDraft(activeCode, { selectedIds: next })}
            renderItem={(id, index) => {
              const q = questionById.get(id);
              if (!q) return <span className="text-muted">삭제된 문항</span>;
              return (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-muted">{index + 1}.</span>{" "}
                    <span className="text-xs font-medium text-gold">L{q.level}</span>
                    <p className="mt-0.5 text-sm text-foreground">{previewText(q.template, 100)}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-muted hover:text-red-600"
                    aria-label="선택 해제"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => toggleQuestion(id, false)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            }}
          />
        </section>
      </div>

      <section className="card-luxe p-5">
        <h2 className="mb-1 font-semibold text-foreground">채점 루브릭 강조점</h2>
        <p className="mb-4 text-xs text-muted">
          플랫폼 기본 기준 중 이 기관이 강조할 항목을 선택하고, 필요하면 직접 문구를
          추가하세요. 저장하지 않으면 플랫폼 기본 루브릭이 적용됩니다.
        </p>
        <div className="space-y-2">
          {activeComp.platformRubricOptions.map((line) => (
            <label key={line} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={activeDraft.checkedPlatformRubric.has(line)}
                onChange={(e) => {
                  const next = new Set(activeDraft.checkedPlatformRubric);
                  if (e.target.checked) next.add(line);
                  else next.delete(line);
                  patchDraft(activeCode, { checkedPlatformRubric: next });
                }}
                className="mt-0.5"
              />
              <span>{line}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {activeDraft.customRubricLines.map((line, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={line}
                placeholder="기관 전용 채점 기준 문구"
                className="input flex-1 text-sm"
                onChange={(e) => {
                  const next = [...activeDraft.customRubricLines];
                  next[i] = e.target.value;
                  patchDraft(activeCode, { customRubricLines: next });
                }}
              />
              <button
                type="button"
                className="text-muted hover:text-red-600"
                onClick={() => {
                  const next = activeDraft.customRubricLines.filter((_, j) => j !== i);
                  patchDraft(activeCode, { customRubricLines: next });
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-accent hover:underline"
            onClick={() =>
              patchDraft(activeCode, {
                customRubricLines: [...activeDraft.customRubricLines, ""],
              })
            }
          >
            <Plus className="h-4 w-4" />
            기준 직접 추가
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={activeDraft.saving}
          onClick={() => void saveCompetency(activeCode)}
        >
          {activeDraft.saving ? "저장 중…" : "이 역량 저장"}
        </button>
        {!usingPlatformDefault && (
          <button
            type="button"
            className="btn-secondary flex items-center gap-1 text-sm"
            disabled={activeDraft.saving}
            onClick={() => void resetCompetency(activeCode)}
          >
            <RotateCcw className="h-4 w-4" />
            플랫폼 기본값으로 되돌리기
          </button>
        )}
        {activeDraft.message && (
          <span
            className={`text-sm ${
              activeDraft.message.includes("실패") || activeDraft.message.includes("최소")
                ? "text-red-600"
                : "text-muted"
            }`}
          >
            {activeDraft.message}
          </span>
        )}
        {activeDraft.dirty && !activeDraft.message && (
          <span className="text-xs text-gold">저장되지 않은 변경사항이 있습니다.</span>
        )}
      </div>
    </div>
  );
}

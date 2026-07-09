"use client";

import { useMemo } from "react";
import {
  Plus,
  Minus,
  Search,
  Layers,
  LayoutPanelLeft,
  Sparkles,
  ListChecks,
  X,
} from "lucide-react";
import { MotionReorderList } from "@/components/org/MotionReorderList";
import { competencyLabel } from "@/lib/labels";
import {
  KIT_RUBRIC_LEVELS,
  type ApiCompetency,
  type ApiPayload,
  type ApiQuestion,
  type CompetencyDraft,
  type LevelRubricDraft,
} from "@/components/org/kit-workspace-types";
import { platformRubricForLevel } from "@/lib/org/kit-rubric";
import { rubricForCompetencyLevel } from "@/lib/competency/rubric";

const COMP_STYLES: Record<string, { bar: string; glow: string }> = {
  COMMUNICATION: { bar: "bg-sky-500", glow: "ring-sky-300/50" },
  PROBLEM_SOLVING: { bar: "bg-violet-500", glow: "ring-violet-300/50" },
  JOB_FIT: { bar: "bg-emerald-500", glow: "ring-emerald-300/50" },
  ORG_FIT: { bar: "bg-amber-500", glow: "ring-amber-300/50" },
  LEADERSHIP: { bar: "bg-rose-500", glow: "ring-rose-300/50" },
  GROWTH: { bar: "bg-teal-500", glow: "ring-teal-300/50" },
};

const WORKSPACE_HEIGHT = "h-[clamp(560px,78vh,820px)]";

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
  questionById: Map<string, ApiQuestion>;
  questionsByComp: Map<string, ApiQuestion[]>;
  compByCode: Map<string, ApiCompetency>;
  onPaletteCode: (code: string) => void;
  onActiveCode: (code: string) => void;
  onSearch: (v: string) => void;
  onLevelFilter: (v: number | null) => void;
  onAddCompetency: (code: string) => void;
  onRemoveCompetency: (code: string) => void;
  onAddQuestion: (code: string, questionId: string) => void;
  onRemoveQuestion: (code: string, questionId: string) => void;
  onReorderQuestions: (code: string, questionIds: string[]) => void;
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

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border transition ${
        selected ? `border-gold/50 ring-2 ${style.glow}` : "border-white/10"
      } ${inKit ? "opacity-55" : ""}`}
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 100%)" }}
    >
      <div className={`w-1 shrink-0 ${style.bar}`} />
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 px-3 py-2 text-left">
        <p className="text-sm font-semibold text-white">{comp.nameKo}</p>
        <p className="text-[11px] text-white/50">
          {competencyLabel(comp.code)} · {questionCount}문항
        </p>
      </button>
      {inKit ? (
        <span className="flex items-center px-3 text-[10px] font-bold text-gold">IN KIT</span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 px-2.5 text-gold hover:bg-white/10"
          title="킷에 추가"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function BankQuestionCard({
  q,
  inKit,
  onAdd,
}: {
  q: ApiQuestion;
  inKit: boolean;
  onAdd: () => void;
}) {
  return (
    <div
      className={`flex gap-2 rounded-lg border p-2 ${
        inKit
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : "border-white/10 bg-white/5 hover:border-gold/40"
      } ${!q.isActive ? "opacity-35" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-gold">
          L{q.level}
        </span>
        <p className="mt-1 text-xs leading-snug text-white/85">{previewText(q.template, 80)}</p>
      </div>
      {!inKit && q.isActive && (
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 self-center rounded p-1.5 text-gold hover:bg-white/10"
          title="킷에 추가"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      {inKit && (
        <span className="shrink-0 self-center text-[10px] text-white/40">추가됨</span>
      )}
    </div>
  );
}

function KitQuestionRow({
  index,
  question,
  onRemove,
}: {
  index: number;
  question: ApiQuestion | undefined;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <span className="text-[10px] text-muted">{index + 1}.</span>{" "}
        <span className="text-[10px] font-bold text-gold">L{question?.level ?? "?"}</span>
        <p className="mt-0.5 text-xs">{question ? previewText(question.template, 72) : "—"}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
        title="제거"
      >
        <Minus className="h-4 w-4" />
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
  onReorderQuestions,
}: {
  comp: ApiCompetency;
  draft: CompetencyDraft;
  questionById: Map<string, ApiQuestion>;
  active: boolean;
  limits: { min: number; recommended: number };
  onSelect: () => void;
  onRemove: () => void;
  onRemoveQuestion: (questionId: string) => void;
  onReorderQuestions: (questionIds: string[]) => void;
}) {
  const style = compStyle(comp.code);
  const levelCounts = [0, 0, 0, 0, 0, 0];
  for (const id of draft.selectedIds) {
    const q = questionById.get(id);
    if (q && q.level >= 1 && q.level <= 5) levelCounts[q.level]++;
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        active ? `border-accent/50 ring-2 ${style.glow}` : "border-card-border"
      }`}
    >
      <div className="flex items-center gap-3 border-b border-card-border px-4 py-3">
        <div className={`h-9 w-1 shrink-0 rounded-full ${style.bar}`} />
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
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-red-50 hover:text-red-600"
          title="역량 제거"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-[88px] p-3">
        {draft.selectedIds.length === 0 ? (
          <p className="flex h-20 items-center justify-center rounded-xl border border-dashed border-accent/30 bg-accent/[0.02] text-center text-xs text-muted">
            왼쪽 문항 뱅크에서 + 로 추가하세요
          </p>
        ) : (
          <div className="rounded-xl border border-card-border bg-white p-2 shadow-sm">
            <MotionReorderList
              ids={draft.selectedIds}
              onReorder={onReorderQuestions}
              renderItem={(id, index) => (
                <KitQuestionRow
                  index={index}
                  question={questionById.get(id)}
                  onRemove={() => onRemoveQuestion(id)}
                />
              )}
            />
          </div>
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
    questionById,
    questionsByComp,
    compByCode,
    onPaletteCode,
    onActiveCode,
    onSearch,
    onLevelFilter,
    onAddCompetency,
    onRemoveCompetency,
    onAddQuestion,
    onRemoveQuestion,
    onReorderQuestions,
    onPatchDraft,
    onSave,
  } = props;

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
  const activeKitIds = new Set(drafts[paletteCode]?.selectedIds ?? []);
  const totalQuestions = kitCompetencies.reduce(
    (sum, code) => sum + (drafts[code]?.selectedIds.length ?? 0),
    0
  );

  if (!activeComp || !activeDraft) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-card-border bg-gradient-to-r from-slate-50 via-white to-gold/5 px-5 py-3">
        <Sparkles className="h-5 w-5 text-gold" />
        <span className="text-sm font-semibold">기관 인터뷰 킷 스튜디오</span>
        <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs text-foreground">
          {data.organizationName}
        </span>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent">
          역량 {kitCompetencies.length}
        </span>
        <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-xs text-gold">
          문항 {totalQuestions}
        </span>
        {data.mode === "superadmin" && (
          <span className="text-xs text-muted">슈퍼어드민 보기</span>
        )}
      </div>

      <div
        className={`grid ${WORKSPACE_HEIGHT} grid-cols-1 overflow-hidden rounded-2xl border border-card-border shadow-luxe xl:grid-cols-[minmax(168px,188px)_minmax(220px,260px)_1fr_minmax(232px,272px)]`}
      >
        <aside className="flex min-h-0 flex-col bg-[#0f172a] text-white xl:border-r xl:border-white/10">
          <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold">
              <LayoutPanelLeft className="h-3.5 w-3.5" />
              역량
            </div>
            <p className="mt-1 text-[10px] text-white/40">플랫폼 뱅크 → 킷에 매핑</p>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
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
        </aside>

        <aside className="flex min-h-0 flex-col border-t border-card-border bg-[#1e293b] text-white xl:border-t-0 xl:border-r xl:border-white/10">
          <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gold">
                <ListChecks className="h-3.5 w-3.5" />
                문항 뱅크
              </div>
              <span className="truncate text-[10px] text-white/50">
                {competencyLabel(paletteCode)}
              </span>
            </div>
          </div>
          <div className="shrink-0 space-y-2 border-b border-white/10 p-2.5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-white/40" />
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="문항 검색…"
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-2 text-xs text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onLevelFilter(null)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${levelFilter === null ? "bg-gold text-slate-900" : "bg-white/10 text-white/70"}`}
              >
                전체
              </button>
              {[1, 2, 3, 4, 5].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => onLevelFilter(levelFilter === lv ? null : lv)}
                  className={`rounded px-2 py-0.5 text-[10px] font-medium ${levelFilter === lv ? "bg-gold text-slate-900" : "bg-white/10 text-white/70"}`}
                >
                  L{lv}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
            {bankQuestions.length === 0 ? (
              <p className="py-8 text-center text-xs text-white/40">표시할 문항이 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {bankQuestions.map((q) => (
                  <BankQuestionCard
                    key={q.id}
                    q={q}
                    inKit={activeKitIds.has(q.id)}
                    onAdd={() => onAddQuestion(paletteCode, q.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-gradient-to-br from-slate-50 to-white">
          <div className="shrink-0 flex items-center gap-2 border-b border-card-border/60 px-4 py-3">
            <Layers className="h-5 w-5 text-accent" />
            <h2 className="font-semibold">나의 인터뷰 킷</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {kitCompetencies.length === 0 ? (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-card-border p-10 text-center">
                <p className="font-medium">역량을 + 버튼으로 추가하세요</p>
                <p className="mt-1 text-sm text-muted">왼쪽 역량 목록에서 선택 후 추가</p>
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
                      onReorderQuestions={(ids) => onReorderQuestions(code, ids)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-t border-card-border bg-card xl:border-l xl:border-t-0">
          <div className="shrink-0 border-b border-card-border px-4 py-3">
            <p className="text-[10px] font-bold uppercase text-gold">채점 루브릭</p>
            <h3 className="font-semibold">{activeComp.nameKo}</h3>
          </div>

          <div className="shrink-0 flex flex-wrap gap-1.5 px-4 py-2">
            {KIT_RUBRIC_LEVELS.map((lv) => {
              const key = String(lv);
              const state = activeDraft.rubricByLevel[key];
              const platformCount = platformRubricForLevel(
                activeComp.code,
                activeComp.rubricByLevel,
                lv
              ).length;
              const selectedCount =
                (state?.checkedPlatform.size ?? 0) +
                (state?.customLines.filter(Boolean).length ?? 0);
              const isActive = activeDraft.rubricLevel === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => onPatchDraft(activeCode, { rubricLevel: lv })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-accent text-white shadow-sm"
                      : platformCount > 0 || selectedCount > 0
                        ? "bg-gold/15 text-gold hover:bg-gold/25"
                        : "bg-background text-muted hover:bg-card-border/40"
                  }`}
                >
                  L{lv}
                  {selectedCount > 0 && <span className="ml-1 opacity-70">({selectedCount})</span>}
                </button>
              );
            })}
          </div>

          {(() => {
            const lv = activeDraft.rubricLevel;
            const key = String(lv);
            const levelState: LevelRubricDraft = activeDraft.rubricByLevel[key] ?? {
              checkedPlatform: new Set(),
              customLines: [],
            };
            const platformLines = platformRubricForLevel(
              activeComp.code,
              activeComp.rubricByLevel,
              lv
            );
            const usesNcsFallback =
              rubricForCompetencyLevel(activeComp.rubricByLevel, lv).length === 0;

            return (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2 text-xs">
                <p className="text-[11px] font-medium text-foreground">
                  L{lv} 채점 기준
                  {usesNcsFallback && (
                    <span className="ml-1 font-normal text-muted">· NCS 기본</span>
                  )}
                </p>
                {platformLines.map((line) => (
                  <label
                    key={line}
                    className="flex gap-2 rounded-lg border border-card-border/60 bg-background/50 px-2.5 py-2"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={levelState.checkedPlatform.has(line)}
                      onChange={(e) => {
                        const next = new Set(levelState.checkedPlatform);
                        if (e.target.checked) next.add(line);
                        else next.delete(line);
                        onPatchDraft(activeCode, {
                          rubricByLevel: {
                            ...activeDraft.rubricByLevel,
                            [key]: { ...levelState, checkedPlatform: next },
                          },
                        });
                      }}
                    />
                    <span className="text-muted">{line}</span>
                  </label>
                ))}
                {levelState.customLines.map((line, i) => (
                  <div key={i} className="flex gap-1">
                    <input
                      className="input flex-1 text-xs"
                      placeholder="기관 맞춤 기준"
                      value={line}
                      onChange={(e) => {
                        const next = [...levelState.customLines];
                        next[i] = e.target.value;
                        onPatchDraft(activeCode, {
                          rubricByLevel: {
                            ...activeDraft.rubricByLevel,
                            [key]: { ...levelState, customLines: next },
                          },
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onPatchDraft(activeCode, {
                          rubricByLevel: {
                            ...activeDraft.rubricByLevel,
                            [key]: {
                              ...levelState,
                              customLines: levelState.customLines.filter((_, j) => j !== i),
                            },
                          },
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
                      rubricByLevel: {
                        ...activeDraft.rubricByLevel,
                        [key]: {
                          ...levelState,
                          customLines: [...levelState.customLines, ""],
                        },
                      },
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" /> L{lv} 기준 추가
                </button>
              </div>
            );
          })()}

          <div className="shrink-0 space-y-2 border-t border-card-border p-4">
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
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CandidateScenarioPayload } from "@/lib/assessment/load-scenario-context";
import { VoiceRecorder } from "@/components/interview/VoiceRecorder";
import {
  readVoiceModeEnabled,
  writeVoiceModeEnabled,
} from "@/lib/voice/voice-mode";

type ItemResponseDraft = {
  actionType: string | null;
  responseText: string;
  savedText: string;
  savedActionType: string | null;
  saving: boolean;
};

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "REPLY", label: "직접 회신" },
  { value: "DELEGATE", label: "위임" },
  { value: "ESCALATE", label: "상부 보고" },
  { value: "DEFER", label: "보류(후속 시점 명시)" },
  { value: "FILE", label: "참고 후 보관" },
];

/**
 * 서류함(In-Basket) 실행 화면 — 좌측 아이템 목록, 우측 응답 작성.
 * 긴급도/중요도/미끼 여부는 서버가 내려주지 않는다(채점 기준 비노출).
 */
export function InBasketRunner({
  attemptId,
  scenario,
  initialResponses,
}: {
  attemptId: string;
  scenario: CandidateScenarioPayload;
  initialResponses: Array<{
    itemId: string;
    actionType: string | null;
    responseText: string;
  }>;
}) {
  const router = useRouter();
  const items = scenario.items;
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  /** 모바일: 목록→상세 전환. 데스크톱에서는 항상 양쪽 표시 */
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, ItemResponseDraft>>(() => {
    const map: Record<string, ItemResponseDraft> = {};
    for (const item of items) {
      const saved = initialResponses.find((r) => r.itemId === item.id);
      map[item.id] = {
        actionType: saved?.actionType ?? null,
        responseText: saved?.responseText ?? "",
        savedText: saved?.responseText ?? "",
        savedActionType: saved?.actionType ?? null,
        saving: false,
      };
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVoiceModeEnabled(readVoiceModeEnabled());
  }, []);

  const answeredCount = useMemo(
    () =>
      items.filter((i) => (drafts[i.id]?.savedText ?? "").trim().length > 0).length,
    [items, drafts],
  );

  const selected = items.find((i) => i.id === selectedId) ?? null;
  const selectedDraft = selected ? drafts[selected.id] : null;

  async function saveItem(itemId: string) {
    const draft = drafts[itemId];
    if (!draft) return;
    const responseText = draft.responseText;
    const actionType = draft.actionType;
    if (responseText === draft.savedText && actionType === draft.savedActionType) return;

    setDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], saving: true } }));
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, actionType, responseText }),
      });
      if (res.ok) {
        setDrafts((d) => ({
          ...d,
          [itemId]: {
            ...d[itemId],
            savedText: responseText,
            savedActionType: actionType,
            saving: false,
          },
        }));
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "저장에 실패했습니다.");
        setDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], saving: false } }));
      }
    } catch {
      setError("네트워크 오류로 저장하지 못했습니다.");
      setDrafts((d) => ({ ...d, [itemId]: { ...d[itemId], saving: false } }));
    }
  }

  // 입력 후 1.5초 디바운스 자동저장
  function scheduleSave(itemId: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveItem(itemId), 1500);
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function selectItem(itemId: string) {
    // 이동 전 현재 아이템 저장
    if (selectedId && selectedId !== itemId) void saveItem(selectedId);
    setSelectedId(itemId);
    setMobileShowDetail(true);
  }

  async function submit() {
    if (submitting) return;
    if (selectedId) await saveItem(selectedId);
    const unanswered = items.filter(
      (i) => (drafts[i.id]?.responseText ?? "").trim().length === 0,
    );
    if (unanswered.length > 0) {
      setError(
        `아직 처리하지 않은 항목이 ${unanswered.length}건 있습니다. 모든 항목을 처리해야 제출할 수 있습니다.`,
      );
      return;
    }
    if (!window.confirm("모든 항목을 제출할까요? 제출 후에는 수정할 수 없습니다.")) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessment/attempts/${attemptId}/submit`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "제출에 실패했습니다.");
        return;
      }
      router.push(`/assessment/attempt/${attemptId}/report`);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:space-y-4 sm:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-accent">서류함 과제</p>
          <h1 className="mt-1 text-lg font-bold leading-snug text-foreground sm:text-xl">
            {scenario.titleKo}
          </h1>
          {scenario.roleContext ? (
            <p className="mt-1 text-sm text-muted">{scenario.roleContext}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setVoiceModeEnabled((prev) => {
                const next = !prev;
                writeVoiceModeEnabled(next);
                return next;
              });
            }}
            className="min-h-9 rounded-full border border-card-border bg-card px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
          >
            {voiceModeEnabled ? "음성 ON" : "텍스트 모드"}
          </button>
          <span className="min-h-9 inline-flex items-center rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted">
            처리 {answeredCount} / {items.length}건
          </span>
        </div>
      </div>

      <section
        className={`card-luxe p-3 sm:p-4 ${mobileShowDetail ? "hidden lg:block" : ""}`}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted">
          {scenario.taskBrief}
        </p>
      </section>

      {error ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* 목록 — 모바일에서는 상세 열리면 숨김 */}
        <section
          className={`card-luxe max-h-[min(28rem,55dvh)] overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch] lg:max-h-[32rem] ${
            mobileShowDetail ? "hidden lg:block" : ""
          }`}
        >
          <ul className="divide-y divide-card-border">
            {items.map((item, index) => {
              const answered =
                (drafts[item.id]?.savedText ?? "").trim().length > 0;
              const active = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => selectItem(item.id)}
                    className={`min-h-14 w-full px-3 py-3 text-left transition ${
                      active ? "bg-card" : "hover:bg-card/60 active:bg-card/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted">
                        <span className="mr-1.5 font-medium text-foreground/70">
                          {index + 1}.
                        </span>
                        {item.fromLabel}
                      </p>
                      <span
                        className={`shrink-0 text-xs ${answered ? "text-success" : "text-muted"}`}
                      >
                        {answered ? "처리됨" : "미처리"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                      {item.subject}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 상세 — 모바일에서는 탭 후에만 */}
        <section
          className={`card-luxe flex flex-col p-3 sm:p-4 ${
            mobileShowDetail ? "" : "hidden lg:flex"
          }`}
        >
          {selected && selectedDraft ? (
            <>
              <button
                type="button"
                onClick={() => {
                  void saveItem(selected.id);
                  setMobileShowDetail(false);
                }}
                className="mb-3 min-h-10 text-left text-sm font-medium text-accent hover:underline lg:hidden"
              >
                ← 문서 목록
              </button>
              <div className="border-b border-card-border pb-3">
                <p className="text-xs text-muted">보낸 사람: {selected.fromLabel}</p>
                <h2 className="mt-1 text-base font-semibold leading-snug text-foreground sm:text-lg">
                  {selected.subject}
                </h2>
                <p className="mt-3 max-h-[40dvh] overflow-y-auto overscroll-contain whitespace-pre-line break-words text-sm leading-relaxed text-muted sm:max-h-40 [-webkit-overflow-scrolling:touch]">
                  {selected.body}
                </p>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">
                    처리 방식
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                    {ACTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setDrafts((d) => ({
                            ...d,
                            [selected.id]: {
                              ...d[selected.id],
                              actionType:
                                d[selected.id].actionType === opt.value
                                  ? null
                                  : opt.value,
                            },
                          }));
                          scheduleSave(selected.id);
                        }}
                        className={`min-h-10 rounded-full border px-3 py-2 text-xs transition sm:py-1 ${
                          selectedDraft.actionType === opt.value
                            ? "border-accent bg-accent/10 font-medium text-accent"
                            : "border-card-border text-muted hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium text-foreground">
                      처리 내용
                    </label>
                    <span className="text-xs text-muted">
                      {selectedDraft.saving
                        ? "저장 중…"
                        : selectedDraft.responseText === selectedDraft.savedText &&
                            selectedDraft.actionType === selectedDraft.savedActionType
                          ? selectedDraft.savedText
                            ? "저장됨"
                            : ""
                          : "저장 대기"}
                    </span>
                  </div>
                  {voiceModeEnabled ? (
                    <div className="mt-2 rounded-xl border border-card-border bg-background/60 p-3">
                      <VoiceRecorder
                        voiceInputEnabled
                        allowTextFallback
                        submitMode="draft"
                        confirmLabel="텍스트에 반영"
                        idleHint="처리 내용을 말씀하세요 — 반영 후 아래에서 수정할 수 있습니다"
                        disabled={submitting}
                        onTranscript={(text) => {
                          setDrafts((d) => {
                            const prev = d[selected.id]?.responseText?.trim() ?? "";
                            const next = prev ? `${prev}\n${text}` : text;
                            return {
                              ...d,
                              [selected.id]: {
                                ...d[selected.id],
                                responseText: next.slice(0, 4000),
                              },
                            };
                          });
                          scheduleSave(selected.id);
                        }}
                      />
                    </div>
                  ) : null}
                  <textarea
                    value={selectedDraft.responseText}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDrafts((d) => ({
                        ...d,
                        [selected.id]: { ...d[selected.id], responseText: value },
                      }));
                      scheduleSave(selected.id);
                    }}
                    onBlur={() => void saveItem(selected.id)}
                    rows={7}
                    maxLength={4000}
                    placeholder={
                      voiceModeEnabled
                        ? "음성으로 받아쓴 내용이 여기에 쌓입니다. 제출 전 자유롭게 수정하세요."
                        : "이 항목을 실제로 어떻게 처리할지 구체적으로 작성하세요."
                    }
                    className="mt-1.5 w-full resize-y rounded-xl border border-card-border bg-background px-3 py-2 text-base leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-accent sm:text-sm"
                    disabled={submitting}
                  />
                  <p className="mt-1 text-right text-xs text-muted">
                    {selectedDraft.responseText.length} / 4000자
                    {voiceModeEnabled ? " · 1.5초 후 자동저장" : ""}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">왼쪽에서 항목을 선택하세요.</p>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-card-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-4xl justify-stretch sm:justify-end">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="min-h-11 w-full rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {submitting
              ? "채점 중… (최대 1분)"
              : `전체 제출하기 (${answeredCount}/${items.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

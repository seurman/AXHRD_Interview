"use client";

import { useMemo, useState } from "react";
import type { LoadedCriterion, ReviewCategory } from "@/lib/interview/resume-review-criteria-data";
import { REVIEW_CATEGORY_LABELS } from "@/lib/interview/resume-review-criteria-data";

type Props = {
  initialCriteria: LoadedCriterion[];
  readOnly?: boolean;
};

type Draft = {
  code: string;
  category: ReviewCategory;
  title: string;
  description: string;
  howToCheck: string;
  weight: string;
  sortOrder: string;
  isActive: boolean;
  sourceNote: string;
};

const emptyDraft = (): Draft => ({
  code: "",
  category: "FORMAT_LOGIC",
  title: "",
  description: "",
  howToCheck: "",
  weight: "1",
  sortOrder: "100",
  isActive: true,
  sourceNote: "",
});

function toDraft(c: LoadedCriterion): Draft {
  return {
    code: c.code,
    category: c.category,
    title: c.title,
    description: c.description,
    howToCheck: c.howToCheck,
    weight: String(c.weight),
    sortOrder: String(c.sortOrder),
    isActive: c.isActive,
    sourceNote: c.sourceNote ?? "",
  };
}

export function ResumeReviewCriteriaPanel({ initialCriteria, readOnly }: Props) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [filter, setFilter] = useState<ReviewCategory | "ALL">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      criteria.filter((c) => (filter === "ALL" ? true : c.category === filter)),
    [criteria, filter]
  );

  async function refresh() {
    const res = await fetch("/api/admin/resume-review-criteria");
    if (!res.ok) return;
    const data = (await res.json()) as { criteria: LoadedCriterion[] };
    setCriteria(data.criteria);
  }

  async function saveCreate() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/resume-review-criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: draft.code,
          category: draft.category,
          title: draft.title,
          description: draft.description,
          howToCheck: draft.howToCheck,
          weight: Number(draft.weight) || 1,
          sortOrder: Number(draft.sortOrder) || 100,
          isActive: draft.isActive,
          sourceNote: draft.sourceNote || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "추가 실패");
        return;
      }
      setCreating(false);
      setDraft(emptyDraft());
      setMessage("기준을 추가했습니다.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/resume-review-criteria/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: draft.code,
          category: draft.category,
          title: draft.title,
          description: draft.description,
          howToCheck: draft.howToCheck,
          weight: Number(draft.weight) || 1,
          sortOrder: Number(draft.sortOrder) || 0,
          isActive: draft.isActive,
          sourceNote: draft.sourceNote || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "수정 실패");
        return;
      }
      setEditingId(null);
      setMessage("기준을 수정했습니다.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`「${title}」 기준을 삭제할까요?`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/resume-review-criteria/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "삭제 실패");
        return;
      }
      setMessage("기준을 삭제했습니다.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function FormFields({ onSubmitLabel, onSubmit }: { onSubmitLabel: string; onSubmit: () => void }) {
    return (
      <div className="space-y-3 rounded-xl border border-card-border bg-background/60 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            <span className="text-muted">코드 (영문)</span>
            <input
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              disabled={readOnly || busy}
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted">축</span>
            <select
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => ({ ...d, category: e.target.value as ReviewCategory }))
              }
              disabled={readOnly || busy}
            >
              {(Object.keys(REVIEW_CATEGORY_LABELS) as ReviewCategory[]).map((k) => (
                <option key={k} value={k}>
                  {REVIEW_CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs">
          <span className="text-muted">제목</span>
          <input
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            disabled={readOnly || busy}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted">정의 (자소서가 갖춰야 할 요건)</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            rows={3}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            disabled={readOnly || busy}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted">확인 방법 (첨삭 시 체크 포인트)</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            rows={3}
            value={draft.howToCheck}
            onChange={(e) => setDraft((d) => ({ ...d, howToCheck: e.target.value }))}
            disabled={readOnly || busy}
          />
        </label>
        <label className="block text-xs">
          <span className="text-muted">출처·메모</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            rows={2}
            value={draft.sourceNote}
            onChange={(e) => setDraft((d) => ({ ...d, sourceNote: e.target.value }))}
            disabled={readOnly || busy}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs">
            <span className="text-muted">가중치</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={draft.weight}
              onChange={(e) => setDraft((d) => ({ ...d, weight: e.target.value }))}
              disabled={readOnly || busy}
            />
          </label>
          <label className="block text-xs">
            <span className="text-muted">정렬</span>
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              value={draft.sortOrder}
              onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
              disabled={readOnly || busy}
            />
          </label>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
              disabled={readOnly || busy}
            />
            첨삭에 사용
          </label>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn-primary px-4 py-2 text-sm"
              disabled={busy}
              onClick={onSubmit}
            >
              {onSubmitLabel}
            </button>
            <button
              type="button"
              className="rounded-lg border border-card-border px-4 py-2 text-sm"
              disabled={busy}
              onClick={() => {
                setCreating(false);
                setEditingId(null);
                setDraft(emptyDraft());
              }}
            >
              취소
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-muted">
        첨삭은 아래 활성 기준과 자소서를 비교합니다.{" "}
        <strong className="font-medium text-foreground">형식·논리</strong>,{" "}
        <strong className="font-medium text-foreground">산업·직무 역량</strong>,{" "}
        <strong className="font-medium text-foreground">STAR·BEI</strong> 축과{" "}
        <strong className="font-medium text-foreground">수정·보완</strong> 액션이 리포트에
        드러납니다. 기본값은 채용 자소서 가이드(체크리스트·STAR·BEI) 조사로 시드되어 있습니다.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            filter === "ALL" ? "bg-accent text-white" : "border border-card-border"
          }`}
        >
          전체 ({criteria.length})
        </button>
        {(Object.keys(REVIEW_CATEGORY_LABELS) as ReviewCategory[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              filter === k ? "bg-accent text-white" : "border border-card-border"
            }`}
          >
            {REVIEW_CATEGORY_LABELS[k]} (
            {criteria.filter((c) => c.category === k).length})
          </button>
        ))}
        {!readOnly && (
          <button
            type="button"
            className="ml-auto rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold"
            disabled={busy || creating}
            onClick={() => {
              setEditingId(null);
              setCreating(true);
              setDraft(emptyDraft());
            }}
          >
            + 기준 추가
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {message}
        </p>
      )}

      {creating && <FormFields onSubmitLabel="추가" onSubmit={saveCreate} />}

      <ul className="space-y-3">
        {visible.map((c) => (
          <li
            key={c.id}
            className="rounded-xl border border-card-border bg-card/40 p-4"
          >
            {editingId === c.id ? (
              <FormFields onSubmitLabel="저장" onSubmit={() => saveEdit(c.id)} />
            ) : (
              <>
                <div className="flex flex-wrap items-start gap-2">
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                    {REVIEW_CATEGORY_LABELS[c.category]}
                  </span>
                  {!c.isActive && (
                    <span className="rounded-full bg-muted/20 px-2.5 py-0.5 text-xs text-muted">
                      비활성
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted">{c.code}</span>
                  <span className="ml-auto text-xs text-muted">
                    w={c.weight} · #{c.sortOrder}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{c.description}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  <span className="font-medium text-foreground">확인: </span>
                  {c.howToCheck}
                </p>
                {c.sourceNote && (
                  <p className="mt-1 text-xs text-muted/80">출처: {c.sourceNote}</p>
                )}
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-card-border px-3 py-1.5 text-xs"
                      disabled={busy}
                      onClick={() => {
                        setCreating(false);
                        setEditingId(c.id);
                        setDraft(toDraft(c));
                      }}
                    >
                      편집
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-card-border px-3 py-1.5 text-xs"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await fetch(`/api/admin/resume-review-criteria/${c.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isActive: !c.isActive }),
                          });
                          await refresh();
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {c.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger"
                      disabled={busy}
                      onClick={() => remove(c.id, c.title)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

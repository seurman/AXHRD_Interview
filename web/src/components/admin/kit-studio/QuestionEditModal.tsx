"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { BankQuestion } from "./bank-types";

export function QuestionEditModal({
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
  const [rubricText, setRubricText] = useState((question.rubricCriteria ?? []).join("\n"));
  const [hintsText, setHintsText] = useState((question.followUpHints ?? []).join("\n"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-luxe max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h3 className="text-lg font-bold">문항 · IRT · 루브릭</h3>
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
                <option key={l} value={l}>
                  L{l}
                </option>
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

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isShowcase ?? false}
            onChange={(e) => setDraft({ ...draft, isShowcase: e.target.checked })}
            className="rounded border-card-border"
          />
          <span>
            <strong className="text-foreground">쇼케이스 문항</strong> — 비로그인 티저·FREE 티어에만
            노출
          </span>
        </label>

        <label className="mt-4 block text-sm font-medium">채점 루브릭 (한 줄에 기준 1개)</label>
        <textarea
          className="input-luxe mt-1 min-h-[120px] w-full font-mono text-xs"
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
                rubricCriteria: rubricText
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                followUpHints: hintsText
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
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

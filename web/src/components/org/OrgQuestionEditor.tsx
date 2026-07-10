"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";

type Question = {
  id: string;
  level: number;
  template: string;
  difficulty: number;
  discrimination: number;
};

type Props = {
  competencyId: string;
  organizationId?: string;
};

export function OrgQuestionEditor({ competencyId, organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    level: 3,
    template: "",
    difficulty: 0,
    discrimination: 1,
  });
  const [message, setMessage] = useState<string | null>(null);

  const qUrl = `/api/org/content/competencies/${competencyId}/questions${
    organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : ""
  }`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(qUrl);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "불러오기 실패");
        return;
      }
      setQuestions(json.questions ?? []);
      setReadOnly(Boolean(json.readOnly));
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, [qUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addQuestion() {
    if (readOnly) return;
    const res = await fetch(qUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "추가 실패");
      return;
    }
    setMessage("문항이 추가되었습니다.");
    setForm({ level: 3, template: "", difficulty: 0, discrimination: 1 });
    void load();
  }

  if (loading) return <p className="text-sm text-muted">문항 불러오는 중…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <Link href="/org/settings/competencies" className="inline-flex items-center gap-1 text-sm text-accent">
        <ChevronLeft className="h-4 w-4" />
        역량 관리
      </Link>

      <p className="text-xs text-amber-700 dark:text-amber-300">
        difficulty·discrimination 초기값은 작성자 추정치입니다. 응답이 쌓이면 추후 재보정을 검토합니다.
      </p>

      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id} className="card-luxe p-4 text-sm">
            <p className="text-xs text-muted">
              L{q.level} · b={q.difficulty} · a={q.discrimination}
            </p>
            <p className="mt-1">{q.template}</p>
          </li>
        ))}
      </ul>

      {!readOnly && (
        <div className="card-luxe space-y-3 p-5">
          <h3 className="font-semibold">문항 추가</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              레벨
              <input
                type="number"
                min={1}
                max={5}
                className="input mt-1 w-full"
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}
              />
            </label>
            <label className="text-xs">
              difficulty (b)
              <input
                type="number"
                step="0.1"
                className="input mt-1 w-full"
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: Number(e.target.value) }))}
              />
            </label>
            <label className="text-xs">
              discrimination (a)
              <input
                type="number"
                step="0.1"
                className="input mt-1 w-full"
                value={form.discrimination}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discrimination: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <textarea
            className="input min-h-[100px] w-full text-sm"
            placeholder="면접 질문 템플릿"
            value={form.template}
            onChange={(e) => setForm((f) => ({ ...f, template: e.target.value }))}
          />
          <button type="button" className="btn-primary flex items-center gap-1 text-sm" onClick={() => void addQuestion()}>
            <Plus className="h-4 w-4" />
            추가
          </button>
        </div>
      )}

      {readOnly && (
        <p className="text-sm text-muted">플랫폼 역량 문항은 읽기 전용입니다. 복제해서 커스터마이징하세요.</p>
      )}

      {message && <p className="text-center text-xs text-muted">{message}</p>}
    </div>
  );
}

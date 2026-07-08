"use client";

import { useEffect, useState } from "react";
import type { DemoCompetencyDto, DemoQuestionDto } from "@/lib/demo/workspace";

type Props = { slug: string };

type Snap = {
  workspace: { name: string; description: string | null };
  competencies: DemoCompetencyDto[];
  questions: DemoQuestionDto[];
};

const LEVELS = [1, 2, 3, 4, 5] as const;

export function DemoShowcase({ slug }: Props) {
  const [snap, setSnap] = useState<Snap | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [level, setLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/demo/${slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("데모를 불러올 수 없습니다.");
        return res.json();
      })
      .then((data: Snap) => {
        setSnap(data);
        setSelectedId(data.competencies[0]?.id ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "오류"));
  }, [slug]);

  if (error) {
    return <p className="text-center text-sm text-muted">{error}</p>;
  }
  if (!snap) {
    return <p className="text-center text-sm text-muted">불러오는 중…</p>;
  }

  const comp = snap.competencies.find((c) => c.id === selectedId);
  const levelQuestions = snap.questions.filter(
    (q) => q.competencyId === selectedId && q.level === level
  );
  const rubric = comp?.rubricByLevel[String(level)] ?? comp?.rubricByLevel.default ?? [];

  return (
    <div className="space-y-8">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gold">HR_IN Demo</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{snap.workspace.name}</h1>
        {snap.workspace.description && (
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{snap.workspace.description}</p>
        )}
      </header>

      <section className="rounded-xl border border-card-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">역량</h2>
        <div className="flex flex-wrap gap-2">
          {snap.competencies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                selectedId === c.id
                  ? "border-gold bg-gold/10 text-foreground"
                  : "border-card-border text-muted"
              }`}
            >
              {c.nameKo}
              <span className="ml-1 text-xs opacity-70">({c.code})</span>
            </button>
          ))}
        </div>
      </section>

      {comp && (
        <>
          <section className="rounded-xl border border-card-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">질문 리스트 · {comp.nameKo}</h2>
            <div className="mb-4 flex flex-wrap gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setLevel(lv)}
                  className={`rounded px-3 py-1 text-xs font-medium ${
                    level === lv ? "bg-gold/20 text-gold" : "bg-muted/10 text-muted"
                  }`}
                >
                  L{lv}
                </button>
              ))}
            </div>
            <ul className="space-y-2">
              {levelQuestions.length === 0 ? (
                <li className="text-sm text-muted">이 레벨에 등록된 질문이 없습니다.</li>
              ) : (
                levelQuestions.map((q) => (
                  <li key={q.id} className="rounded-lg border border-card-border px-3 py-2 text-sm">
                    {q.template}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-card-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              루브릭 · {comp.nameKo} L{level}
            </h2>
            {rubric.length === 0 ? (
              <p className="text-sm text-muted">등록된 루브릭 기준이 없습니다.</p>
            ) : (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                {rubric.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

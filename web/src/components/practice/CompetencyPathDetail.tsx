"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CareerTrack, LessonKind } from "@prisma/client";
import { LessonMarkdown } from "./LessonMarkdown";

export type PathLessonView = {
  id: string;
  stage: number;
  kind: LessonKind;
  slug: string;
  titleKo: string;
  bodyMd: string | null;
  quizJson: unknown;
  stageLabel: string;
  locked: boolean;
  completed: boolean;
};

export type PathDetailView = {
  competency: string;
  track: CareerTrack;
  progress: {
    unlockedStage: number;
    streakDays: number;
    masteryScore: number;
    lastDrillAt: string | null;
  };
  lessons: PathLessonView[];
  titleKo: string;
};

type QuizPayload = {
  questions: Array<{
    prompt: string;
    choices: string[];
    answerIndex: number;
    explain: string;
  }>;
};

function parseQuiz(raw: unknown): QuizPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const q = (raw as QuizPayload).questions;
  if (!Array.isArray(q) || q.length === 0) return null;
  return raw as QuizPayload;
}

function actionForKind(kind: LessonKind, competency: string): {
  href?: string;
  label: string;
} {
  if (kind === "SWIPE_DRILL") {
    return { href: "/practice/swipe", label: "질문 카드로 말하기" };
  }
  if (kind === "MOCK") {
    return {
      href: `/interview/setup?competency=${encodeURIComponent(competency)}`,
      label: "실전 모의면접 시작",
    };
  }
  if (kind === "WEAKNESS_DRILL") {
    return { href: "/practice/swipe", label: "약점 카드 다시 말하기" };
  }
  return { label: "퀴즈로 확인" };
}

export function CompetencyPathDetail({ detail }: { detail: PathDetailView }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(
    detail.lessons.find((l) => !l.locked && !l.completed)?.id ??
      detail.lessons.find((l) => !l.locked)?.id ??
      null,
  );
  const active = detail.lessons.find((l) => l.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <Link
          href="/practice/path"
          className="text-xs font-medium text-accent hover:underline"
        >
          ← 역량 학습 패스
        </Link>
        <p className="section-eyebrow">Competency Path</p>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {detail.titleKo}
        </h1>
        <p className="text-sm text-muted">
          해금 stage {detail.progress.unlockedStage} · 스트릭{" "}
          {detail.progress.streakDays}일 · 숙련{" "}
          {Math.round(detail.progress.masteryScore * 100)}%
        </p>
      </header>

      <ol className="space-y-2">
        {detail.lessons.map((lesson) => {
          const selected = lesson.id === activeId;
          return (
            <li key={lesson.id}>
              <button
                type="button"
                disabled={lesson.locked}
                onClick={() => setActiveId(lesson.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  lesson.locked
                    ? "cursor-not-allowed border-card-border/60 bg-primary/[0.02] opacity-60"
                    : selected
                      ? "border-accent/40 bg-accent/5"
                      : "border-card-border bg-card hover:border-accent/30"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    lesson.completed
                      ? "bg-gold/20 text-gold"
                      : lesson.locked
                        ? "bg-muted/20 text-muted"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {lesson.completed ? "✓" : lesson.stage}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{lesson.stageLabel}</p>
                  <p className="truncate text-sm font-medium text-foreground">
                    {lesson.titleKo}
                  </p>
                </div>
                {lesson.locked ? (
                  <span className="text-xs text-muted">잠김</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {active ? (
        <LessonPanel
          lesson={active}
          competency={detail.competency}
          track={detail.track}
          onCompleted={() => router.refresh()}
        />
      ) : (
        <p className="text-sm text-muted">열려 있는 레슨을 선택해 주세요.</p>
      )}
    </div>
  );
}

function LessonPanel({
  lesson,
  competency,
  track,
  onCompleted,
}: {
  lesson: PathLessonView;
  competency: string;
  track: CareerTrack;
  onCompleted: () => void;
}) {
  const quiz = useMemo(() => parseQuiz(lesson.quizJson), [lesson.quizJson]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{
    score: number;
    explain: string[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const external = actionForKind(lesson.kind, competency);

  const submit = (quizScore?: number) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/learning/drill/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            track,
            quizScore,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 402 && json.upgradeUrl) {
            toast.error(json.error ?? "드릴 한도에 도달했습니다.");
            return;
          }
          throw new Error(json.error ?? "완료 처리에 실패했습니다.");
        }
        toast.success(
          quizScore != null && quizScore < 0.7
            ? "기록했어요. 70% 이상이면 다음 단계가 열려요."
            : "다음 단계가 열렸습니다.",
        );
        onCompleted();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "완료 처리에 실패했습니다.");
      }
    });
  };

  const gradeQuiz = () => {
    if (!quiz) return;
    const explains: string[] = [];
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      const picked = answers[i];
      if (picked === q.answerIndex) correct += 1;
      explains.push(q.explain);
    });
    const score = correct / quiz.questions.length;
    setResult({ score, explain: explains });
    submit(score);
  };

  return (
    <section className="card-luxe space-y-5 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          {lesson.stageLabel}
        </p>
        <h2 className="mt-1 text-lg font-bold text-foreground">{lesson.titleKo}</h2>
      </div>

      {lesson.bodyMd ? <LessonMarkdown source={lesson.bodyMd} /> : null}

      {external.href ? (
        <Link href={external.href} className="btn-secondary inline-flex text-sm">
          {external.label} →
        </Link>
      ) : null}

      {quiz ? (
        <div className="space-y-4 border-t border-card-border pt-4">
          {quiz.questions.map((q, qi) => (
            <fieldset key={qi} className="space-y-2">
              <legend className="text-sm font-medium text-foreground">
                {qi + 1}. {q.prompt}
              </legend>
              <div className="space-y-1.5">
                {q.choices.map((choice, ci) => {
                  const selected = answers[qi] === ci;
                  return (
                    <label
                      key={ci}
                      className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                        selected
                          ? "border-accent/50 bg-accent/5"
                          : "border-card-border hover:border-accent/30"
                      }`}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        name={`q-${lesson.id}-${qi}`}
                        checked={selected}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [qi]: ci }))
                        }
                      />
                      <span>{choice}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={
              pending ||
              quiz.questions.some((_, i) => answers[i] === undefined)
            }
            onClick={gradeQuiz}
            className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
          >
            {pending ? "채점 중…" : "퀴즈 제출하고 다음 단계"}
          </button>
          {result ? (
            <div className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted">
              점수 {Math.round(result.score * 100)}% · {result.explain[0]}
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={pending || lesson.locked}
          onClick={() => submit(undefined)}
          className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
        >
          {pending
            ? "저장 중…"
            : lesson.completed
              ? "다시 완료로 표시"
              : "이 단계 완료"}
        </button>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import type { WeaknessRecommendation } from "@/lib/learning/weakness";
import type { PathCompetencySummary } from "@/lib/learning/path";

type Props = {
  weakness: WeaknessRecommendation;
  pathSummary: PathCompetencySummary[];
};

function clampText(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function LearningPathCard({ weakness, pathSummary }: Props) {
  const rows = Array.isArray(pathSummary) ? pathSummary : [];
  const active = rows.filter((c) => c.unlockedStage > 0 || c.streakDays > 0);
  const bestStreak =
    rows.length === 0 ? 0 : Math.max(0, ...rows.map((c) => c.streakDays));
  const questions = weakness.practiceQuestions?.slice(0, 2) ?? [];

  return (
    <section className="card-luxe min-w-0 overflow-hidden">
      <div className="border-b border-card-border bg-gradient-to-r from-primary/10 to-gold/5 px-5 py-4">
        <p className="section-eyebrow text-gold">Competency Path</p>
        <h2 className="font-bold text-foreground">역량 학습 패스</h2>
        <p className="mt-1 text-sm text-muted">
          {active.length > 0
            ? `${active.length}개 역량 진행 중 · 최고 스트릭 ${bestStreak}일`
            : "개념부터 인증까지, 오늘 한 단계만 열어보세요"}
        </p>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="rounded-lg bg-primary/5 px-3 py-2">
          <p className="text-xs font-medium text-muted">오늘의 약점 드릴</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {weakness.titleKo}
            {weakness.dimensionLabelKo ? ` · ${weakness.dimensionLabelKo}` : ""}
          </p>
          <p className="mt-1 break-words text-xs text-muted">{weakness.tip}</p>
          {questions.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {questions.map((q, i) => (
                <li
                  key={q.id ?? i}
                  className="break-words text-xs leading-relaxed text-foreground"
                >
                  {i + 1}. {clampText(q.text)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/practice/path"
            className="btn-primary inline-flex min-h-11 w-full items-center justify-center px-4 text-sm sm:w-auto"
          >
            학습 패스 열기
          </Link>
          <Link
            href={weakness.swipeHref ?? weakness.href}
            className="btn-secondary inline-flex min-h-11 w-full items-center justify-center px-4 text-sm sm:w-auto"
          >
            약점 말하기
          </Link>
        </div>
      </div>
    </section>
  );
}

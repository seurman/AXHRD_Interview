"use client";

import Link from "next/link";
import type { WeaknessRecommendation } from "@/lib/learning/weakness";
import type { PathCompetencySummary } from "@/lib/learning/path";

type Props = {
  weakness: WeaknessRecommendation;
  pathSummary: PathCompetencySummary[];
};

export function LearningPathCard({ weakness, pathSummary }: Props) {
  const active = pathSummary.filter((c) => c.unlockedStage > 0 || c.streakDays > 0);
  const bestStreak = Math.max(0, ...pathSummary.map((c) => c.streakDays));
  const questions = weakness.practiceQuestions?.slice(0, 2) ?? [];

  return (
    <section className="card-luxe overflow-hidden">
      <div className="border-b border-card-border bg-gradient-to-r from-primary/10 to-gold/5 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Competency Path
        </p>
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
          <p className="mt-1 text-xs text-muted">{weakness.tip}</p>
          {questions.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {questions.map((q, i) => (
                <li key={q.id ?? i} className="text-xs leading-relaxed text-foreground">
                  {i + 1}. {q.text}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/practice/path" className="btn-primary px-4 py-2 text-sm">
            학습 패스 열기
          </Link>
          <Link
            href={weakness.swipeHref ?? weakness.href}
            className="btn-secondary px-4 py-2 text-sm"
          >
            약점 말하기
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export type CourseSummary = {
  competency: string;
  titleKo: string;
  blurbKo: string;
  xp: number;
  hearts: number;
  clearedCount: number;
  totalLevels: number;
  progressPct: number;
  hasContent: boolean;
  nextLevelId: string | null;
  nextLevelTitle: string | null;
  continueHref: string;
  completed: boolean;
};

export function GameCourseList({ courses }: { courses: CourseSummary[] }) {
  const totalXp = courses.reduce((s, c) => s + c.xp, 0);
  const totalCleared = courses.reduce((s, c) => s + c.clearedCount, 0);
  const totalLevels = courses.reduce((s, c) => s + c.totalLevels, 0);
  const continueCourse =
    courses.find((c) => c.hasContent && !c.completed && c.nextLevelId) ??
    courses.find((c) => c.hasContent);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3 text-center sm:text-left">
        <p className="section-eyebrow">Competency Game</p>
        <h1 className="text-3xl font-bold text-foreground">역량게임</h1>
        <p className="text-sm leading-relaxed text-muted">
          듀오링고처럼 역량마다 레벨을 깨며 규칙을 쌓습니다. 짧고, 반복하고, 점점
          어려워집니다.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs sm:justify-start">
          <span className="rounded-full bg-gold/10 px-3 py-1 font-semibold text-gold">
            합계 {totalXp} XP
          </span>
          <span className="rounded-full border border-card-border px-3 py-1 text-muted">
            {totalCleared}/{totalLevels} 레벨
          </span>
        </div>
        {continueCourse?.nextLevelId ? (
          <Link
            href={continueCourse.continueHref}
            className="btn-primary inline-flex min-h-11 items-center justify-center px-5 text-sm"
          >
            이어서 하기 · {continueCourse.titleKo}
            {continueCourse.nextLevelTitle
              ? ` · ${continueCourse.nextLevelTitle}`
              : ""}
          </Link>
        ) : null}
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {courses.map((c, i) => (
          <motion.li
            key={c.competency}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="card-luxe flex h-full flex-col p-5">
              <Link
                href={`/practice/game/${c.competency.toLowerCase()}`}
                className="block flex-1 transition hover:opacity-90"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-foreground">{c.titleKo}</h2>
                  <span className="text-[11px] text-muted">
                    {c.clearedCount}/{c.totalLevels}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {c.blurbKo}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold to-primary"
                    style={{ width: `${c.progressPct}%` }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                  <span>{c.xp} XP</span>
                  <span>❤️ {c.hearts}</span>
                  {c.completed ? (
                    <span className="font-semibold text-gold">완료</span>
                  ) : (
                    <span className="font-semibold text-accent">패스 보기</span>
                  )}
                </div>
              </Link>
              {c.nextLevelId && !c.completed ? (
                <Link
                  href={c.continueHref}
                  className="btn-secondary mt-3 inline-flex min-h-11 w-full items-center justify-center text-sm"
                >
                  이어서 · {c.nextLevelTitle ?? "다음 레벨"}
                </Link>
              ) : null}
            </div>
          </motion.li>
        ))}
      </ul>

      <p className="text-center text-xs text-muted">
        6역량 × 8레벨 · 기초→보스 · 후반 혼합 라운드
      </p>
    </div>
  );
}

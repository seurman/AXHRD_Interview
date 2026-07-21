"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type CourseSummary = {
  competency: string;
  titleKo: string;
  blurbKo: string;
  xp: number;
  hearts: number;
  clearedCount: number;
  totalLevels: number;
  hasContent: boolean;
  nextLevelId: string | null;
};

export function GameCourseList({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="section-eyebrow">Competency Game</p>
        <h1 className="text-3xl font-bold text-foreground">역량게임</h1>
        <p className="text-sm leading-relaxed text-muted">
          듀오링고처럼 짧게 맞히고, 따라 말하며 역량 규칙을 쌓습니다. 모의면접과는 별도
          모듈입니다.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {courses.map((c, i) => (
          <motion.li
            key={c.competency}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={`/practice/game/${c.competency.toLowerCase()}`}
              className={`card-luxe block h-full p-5 transition hover:border-accent/40 ${
                !c.hasContent ? "opacity-80" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-foreground">{c.titleKo}</h2>
                <span className="text-[11px] text-muted">
                  {c.clearedCount}/{c.totalLevels}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{c.blurbKo}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted">
                <span>{c.xp} XP</span>
                <span>❤️ {c.hearts}</span>
                {c.hasContent ? (
                  <span className="font-semibold text-accent">플레이</span>
                ) : (
                  <span>곧 오픈</span>
                )}
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>

      <p className="text-center text-xs text-muted">
        Phase A: 의사소통 · 기법당 문항 3개 · 규칙은 맞힌 뒤에 공개
      </p>
    </div>
  );
}

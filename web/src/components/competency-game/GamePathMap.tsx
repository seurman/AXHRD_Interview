"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CourseProgressView } from "@/lib/competency-game/progress";

export function GamePathMap({ view }: { view: CourseProgressView }) {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header className="space-y-2 text-center sm:text-left">
        <p className="section-eyebrow">Competency Game</p>
        <h1 className="text-3xl font-bold text-foreground">{view.titleKo}</h1>
        <p className="text-sm text-muted">{view.blurbKo}</p>
        <div className="flex flex-wrap justify-center gap-3 text-xs text-muted sm:justify-start">
          <span className="rounded-full bg-gold/10 px-3 py-1 font-semibold text-gold">
            {view.xp} XP
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
            ❤️ {view.hearts}
          </span>
          <span className="rounded-full border border-card-border px-3 py-1">
            스트릭 {view.streakDays}일
          </span>
        </div>
      </header>

      {view.units.map((unit) => (
        <section key={unit.id} className="space-y-4">
          <div>
            <h2 className="font-bold text-foreground">{unit.titleKo}</h2>
            <p className="text-xs text-muted">{unit.subtitleKo}</p>
          </div>

          {unit.levels.length === 0 ? (
            <p className="rounded-xl border border-dashed border-card-border px-4 py-6 text-center text-sm text-muted">
              콘텐츠 준비 중 — 의사소통 코스부터 열려 있습니다.
            </p>
          ) : (
            <ol className="relative space-y-3 before:absolute before:left-5 before:top-3 before:bottom-3 before:w-px before:bg-card-border">
              {unit.levels.map((level, i) => {
                const locked = !level.unlocked;
                const href = `/practice/game/${view.competency.toLowerCase()}/${level.id}`;
                return (
                  <motion.li
                    key={level.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pl-12"
                  >
                    <span
                      className={`absolute left-2 top-3 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        level.cleared
                          ? "bg-gold text-white"
                          : locked
                            ? "bg-muted/30 text-muted"
                            : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {level.cleared ? "✓" : level.index + 1}
                    </span>
                    {locked ? (
                      <div className="card-luxe opacity-60 p-4">
                        <p className="text-sm font-semibold text-muted">{level.titleKo}</p>
                        <p className="text-xs text-muted">이전 레벨을 클리어하면 열려요</p>
                      </div>
                    ) : (
                      <Link
                        href={href}
                        className="card-luxe block p-4 transition hover:border-accent/40 touch-manipulation"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {level.titleKo}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              문항 3 · +{level.xpReward} XP
                            </p>
                          </div>
                          {level.cleared ? (
                            <span className="text-xs font-semibold text-gold">클리어</span>
                          ) : (
                            <span className="text-xs font-semibold text-accent">플레이</span>
                          )}
                        </div>
                      </Link>
                    )}
                  </motion.li>
                );
              })}
            </ol>
          )}
        </section>
      ))}

      <Link href="/practice/game" className="inline-flex min-h-11 items-center text-sm text-accent hover:underline">
        ← 역량게임 코스
      </Link>
    </div>
  );
}

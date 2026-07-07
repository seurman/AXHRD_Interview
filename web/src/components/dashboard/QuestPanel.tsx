"use client";

import Link from "next/link";

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  href: string;
  xp: number;
  done: boolean;
  icon: string;
}

interface QuestPanelProps {
  quests: QuestItem[];
  totalXp: number;
  level: number;
}

export function QuestPanel({ quests, totalXp, level }: QuestPanelProps) {
  const pending = quests.filter((q) => !q.done);

  return (
    <section className="card-luxe overflow-hidden">
      <div className="border-b border-card-border bg-gradient-to-r from-gold/10 to-primary/5 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Career Quest</p>
            <h2 className="font-bold text-foreground">오늘의 성장 퀘스트</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Lv.{level}</p>
            <p className="text-sm font-bold text-gold">{totalXp} XP</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-primary transition-all"
            style={{ width: `${Math.min(100, (totalXp % 500) / 5)}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-card-border">
        {pending.length === 0 ? (
          <li className="px-5 py-6 text-center text-sm text-muted">
            오늘의 퀘스트를 모두 완료했습니다 🎉
          </li>
        ) : (
          pending.map((q) => (
            <li key={q.id}>
              <Link
                href={q.href}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-primary/5"
              >
                <span className="text-2xl">{q.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{q.title}</p>
                  <p className="text-sm text-muted">{q.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
                  +{q.xp} XP
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

"use client";

import { useState } from "react";
import type { MatchPairsItem } from "@/lib/competency-game/types";

export function MatchPairsGame({
  item,
  disabled,
  onAnswer,
}: {
  item: MatchPairsItem;
  disabled?: boolean;
  onAnswer: (map: number[]) => void;
}) {
  const [map, setMap] = useState<number[]>(() => item.left.map(() => -1));
  const [activeLeft, setActiveLeft] = useState<number | null>(null);

  const emit = (next: number[]) => {
    setMap(next);
    if (next.every((v) => v >= 0)) onAnswer(next);
  };

  const pickRight = (ri: number) => {
    if (disabled || activeLeft === null) return;
    if (map.includes(ri) && map[activeLeft] !== ri) return;
    const next = [...map];
    next[activeLeft] = ri;
    emit(next);
    setActiveLeft(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <p className="text-xs text-muted">왼쪽을 고른 뒤 오른쪽 짝을 누르세요.</p>
      <div className="grid grid-cols-2 gap-3">
        <ul className="space-y-2">
          {item.left.map((label, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => setActiveLeft(i)}
              className={`flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-left text-sm touch-manipulation ${
                activeLeft === i
                  ? "border-accent bg-accent/10 font-medium"
                  : map[i] >= 0
                    ? "border-emerald-300/50 bg-emerald-500/5"
                    : "border-card-border"
              }`}
            >
              <span className="mr-2 text-xs text-muted">{i + 1}.</span>
              {label}
            </button>
          ))}
        </ul>
        <ul className="space-y-2">
          {item.right.map((label, i) => {
            const used = map.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={disabled || (used && activeLeft === null)}
                onClick={() => pickRight(i)}
                className={`flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-left text-sm touch-manipulation ${
                  used
                    ? "border-emerald-300/50 bg-emerald-500/5 opacity-80"
                    : "border-card-border hover:border-accent/40"
                }`}
              >
                {label}
              </button>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

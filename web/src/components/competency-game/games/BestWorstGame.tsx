"use client";

import { useState } from "react";
import type { BestWorstItem } from "@/lib/competency-game/types";

export function BestWorstGame({
  item,
  disabled,
  onAnswer,
}: {
  item: BestWorstItem;
  disabled?: boolean;
  onAnswer: (bestIndex: number, worstIndex: number) => void;
}) {
  const [best, setBest] = useState<number | null>(null);
  const [worst, setWorst] = useState<number | null>(null);

  const emit = (nextBest: number | null, nextWorst: number | null) => {
    if (nextBest !== null && nextWorst !== null && nextBest !== nextWorst) {
      onAnswer(nextBest, nextWorst);
    }
  };

  const pick = (kind: "best" | "worst", index: number) => {
    if (disabled) return;
    if (kind === "best") {
      const nextWorst = worst === index ? null : worst;
      setBest(index);
      if (worst === index) setWorst(null);
      emit(index, nextWorst);
    } else {
      const nextBest = best === index ? null : best;
      setWorst(index);
      if (best === index) setBest(null);
      emit(nextBest, index);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-card-border bg-primary/[0.04] px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-gold">장면</p>
        <p className="text-sm leading-relaxed text-foreground/90">{item.scenario}</p>
      </div>
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <p className="text-xs text-muted">
        각 보기에서 베스트와 워스트를 하나씩 고르세요. 같은 보기는 중복 선택 불가.
      </p>

      <div className="space-y-2">
        {item.choices.map((choice, i) => {
          const isBest = best === i;
          const isWorst = worst === i;
          return (
            <div
              key={i}
              className={`rounded-xl border px-3 py-2.5 ${
                isBest
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : isWorst
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-card-border"
              }`}
            >
              <p className="mb-2 text-sm text-foreground">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-card-border text-[11px] font-bold text-muted">
                  {String.fromCharCode(65 + i)}
                </span>
                {choice}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => pick("best", i)}
                  className={`min-h-9 flex-1 rounded-lg border px-2 text-xs font-semibold transition ${
                    isBest
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-700"
                      : "border-card-border text-muted hover:border-emerald-500/30"
                  }`}
                >
                  베스트
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => pick("worst", i)}
                  className={`min-h-9 flex-1 rounded-lg border px-2 text-xs font-semibold transition ${
                    isWorst
                      ? "border-rose-500/50 bg-rose-500/15 text-rose-700"
                      : "border-card-border text-muted hover:border-rose-500/30"
                  }`}
                >
                  워스트
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

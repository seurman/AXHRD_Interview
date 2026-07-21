"use client";

import { useState } from "react";
import type { SwipeJudgeItem } from "@/lib/competency-game/types";

export function SwipeJudgeGame({
  item,
  disabled,
  onAnswer,
}: {
  item: SwipeJudgeItem;
  disabled?: boolean;
  onAnswer: (judgedGood: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);

  const pick = (good: boolean) => {
    setPicked(good);
    onAnswer(good);
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <div className="rounded-2xl border border-card-border bg-primary/5 px-4 py-5 text-sm leading-relaxed text-foreground">
        {item.answerText}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => pick(false)}
          className={`min-h-14 rounded-xl border text-sm font-semibold touch-manipulation ${
            picked === false
              ? "border-rose-400 bg-rose-500/10 text-rose-700"
              : "border-card-border hover:border-rose-300"
          }`}
        >
          ← 아쉬운 답
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => pick(true)}
          className={`min-h-14 rounded-xl border text-sm font-semibold touch-manipulation ${
            picked === true
              ? "border-emerald-400 bg-emerald-500/10 text-emerald-700"
              : "border-card-border hover:border-emerald-300"
          }`}
        >
          좋은 답 →
        </button>
      </div>
    </div>
  );
}

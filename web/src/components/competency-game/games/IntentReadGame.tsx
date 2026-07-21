"use client";

import { useState } from "react";
import type { IntentReadItem } from "@/lib/competency-game/types";

export function IntentReadGame({
  item,
  disabled,
  onAnswer,
}: {
  item: IntentReadItem;
  disabled?: boolean;
  onAnswer: (answerIndex: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-card-border bg-primary/[0.04] px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-gold">지문</p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {item.passage}
        </p>
      </div>
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <div className="space-y-2">
        {item.choices.map((choice, i) => {
          const selected = picked === i;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => {
                setPicked(i);
                onAnswer(i);
              }}
              className={`flex min-h-11 w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition touch-manipulation ${
                selected
                  ? "border-accent/50 bg-accent/10 font-medium"
                  : "border-card-border hover:border-accent/30 active:scale-[0.98]"
              }`}
            >
              <span className="mr-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-card-border text-xs font-bold text-muted">
                {String.fromCharCode(65 + i)}
              </span>
              <span>{choice}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

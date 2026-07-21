"use client";

import { useState } from "react";
import type { ChoiceItem } from "@/lib/competency-game/types";

export function ChoiceGame({
  item,
  disabled,
  onAnswer,
}: {
  item: ChoiceItem;
  disabled?: boolean;
  onAnswer: (answerIndex: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [pressing, setPressing] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <div className="space-y-2">
        {item.choices.map((choice, i) => {
          const selected = picked === i;
          const pressed = pressing === i;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onPointerDown={() => setPressing(i)}
              onPointerUp={() => setPressing(null)}
              onPointerLeave={() => setPressing(null)}
              onClick={() => {
                setPicked(i);
                onAnswer(i);
              }}
              className={`flex min-h-11 w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition touch-manipulation ${
                selected
                  ? "border-accent/50 bg-accent/10 font-medium scale-[0.99]"
                  : pressed
                    ? "border-accent/30 bg-accent/5 scale-[0.985]"
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

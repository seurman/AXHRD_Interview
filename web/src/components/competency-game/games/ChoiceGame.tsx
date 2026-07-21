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

  return (
    <div className="space-y-3">
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
                  : "border-card-border hover:border-accent/30"
              }`}
            >
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}

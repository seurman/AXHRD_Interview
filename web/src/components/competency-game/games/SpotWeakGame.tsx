"use client";

import { useState } from "react";
import type { SpotWeakItem } from "@/lib/competency-game/types";

export function SpotWeakGame({
  item,
  disabled,
  onAnswer,
}: {
  item: SpotWeakItem;
  disabled?: boolean;
  onAnswer: (weakIndex: number) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <ul className="space-y-2">
        {item.sentences.map((s, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => {
              setPicked(i);
              onAnswer(i);
            }}
            className={`flex min-h-11 w-full items-start gap-2 rounded-xl border px-4 py-3 text-left text-sm touch-manipulation ${
              picked === i
                ? "border-accent/50 bg-accent/10 font-medium"
                : "border-card-border hover:border-accent/30"
            }`}
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span>{s}</span>
          </button>
        ))}
      </ul>
    </div>
  );
}

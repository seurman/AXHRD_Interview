"use client";

import { useState } from "react";
import type { TrueFalseItem } from "@/lib/competency-game/types";

export function TrueFalseGame({
  item,
  disabled,
  onAnswer,
}: {
  item: TrueFalseItem;
  disabled?: boolean;
  onAnswer: (judgedTrue: boolean) => void;
}) {
  const [picked, setPicked] = useState<boolean | null>(null);

  const pick = (v: boolean) => {
    setPicked(v);
    onAnswer(v);
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <div className="rounded-2xl border border-card-border bg-primary/5 px-4 py-5 text-sm leading-relaxed text-foreground">
        {item.statement}
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
          거짓
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
          참
        </button>
      </div>
    </div>
  );
}

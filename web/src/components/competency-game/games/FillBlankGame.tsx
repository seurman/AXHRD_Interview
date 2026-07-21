"use client";

import { useMemo, useState } from "react";
import type { FillBlankItem } from "@/lib/competency-game/types";

export function FillBlankGame({
  item,
  disabled,
  onAnswer,
}: {
  item: FillBlankItem;
  disabled?: boolean;
  onAnswer: (blankIndexes: number[]) => void;
}) {
  const parts = useMemo(() => item.template.split("___"), [item.template]);
  const [picks, setPicks] = useState<number[]>(() =>
    item.blanks.map(() => -1),
  );

  const setPick = (blankIdx: number, optionIdx: number) => {
    const next = [...picks];
    next[blankIdx] = optionIdx;
    setPicks(next);
    if (next.every((v) => v >= 0)) onAnswer(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <p className="text-sm leading-relaxed text-foreground">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < item.blanks.length ? (
              <span className="mx-1 inline-flex min-w-[6rem] justify-center rounded-md border border-dashed border-accent/40 bg-accent/5 px-2 py-0.5 text-accent">
                {picks[i] >= 0 ? item.blanks[i].options[picks[i]] : "___"}
              </span>
            ) : null}
          </span>
        ))}
      </p>
      {item.blanks.map((blank, bi) => (
        <div key={bi} className="space-y-2">
          <p className="text-xs font-medium text-muted">빈칸 {bi + 1}</p>
          <div className="flex flex-wrap gap-2">
            {blank.options.map((opt, oi) => (
              <button
                key={oi}
                type="button"
                disabled={disabled}
                onClick={() => setPick(bi, oi)}
                className={`min-h-11 rounded-full border px-3 text-sm touch-manipulation ${
                  picks[bi] === oi
                    ? "border-accent bg-accent/10 font-medium"
                    : "border-card-border hover:border-accent/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

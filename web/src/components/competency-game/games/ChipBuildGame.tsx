"use client";

import { useState } from "react";
import type { ChipBuildItem } from "@/lib/competency-game/types";

export function ChipBuildGame({
  item,
  disabled,
  onAnswer,
}: {
  item: ChipBuildItem;
  disabled?: boolean;
  onAnswer: (order: number[]) => void;
}) {
  const [order, setOrder] = useState<number[]>([]);

  const toggle = (idx: number) => {
    if (disabled) return;
    let next: number[];
    if (order.includes(idx)) {
      next = order.filter((x) => x !== idx);
    } else {
      next = [...order, idx];
    }
    setOrder(next);
    if (next.length === item.chips.length) onAnswer(next);
  };

  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <div className="min-h-16 rounded-2xl border border-dashed border-accent/40 bg-accent/5 px-3 py-3 text-sm text-foreground">
        {order.length === 0 ? (
          <span className="text-muted">조각을 순서대로 눌러 문장을 만드세요</span>
        ) : (
          order.map((i) => item.chips[i]).join(" ")
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {item.chips.map((chip, i) => {
          const used = order.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => toggle(i)}
              className={`min-h-11 rounded-full border px-3 text-sm touch-manipulation ${
                used
                  ? "border-accent bg-accent/10 font-medium opacity-60"
                  : "border-card-border hover:border-accent/40"
              }`}
            >
              {chip}
            </button>
          );
        })}
      </div>
      {order.length > 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOrder([]);
          }}
          className="text-xs text-muted hover:underline"
        >
          다시 조립
        </button>
      ) : null}
    </div>
  );
}

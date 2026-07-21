"use client";

import { useState } from "react";
import type { OrderItem } from "@/lib/competency-game/types";

export function OrderGame({
  item,
  disabled,
  onAnswer,
}: {
  item: OrderItem;
  disabled?: boolean;
  onAnswer: (order: number[]) => void;
}) {
  const [order, setOrder] = useState<number[]>(() => {
    const idxs = item.cards.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = idxs[i];
      idxs[i] = idxs[j];
      idxs[j] = tmp;
    }
    // 우연히 정답 순서면 한 번 더 섞기
    if (idxs.every((v, i) => v === i) && idxs.length > 1) {
      const last = idxs.pop()!;
      idxs.unshift(last);
    }
    return idxs;
  });

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const tmp = next[from];
    next[from] = next[to];
    next[to] = tmp;
    setOrder(next);
    onAnswer(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <ul className="space-y-2">
        {order.map((cardIndex, pos) => (
          <li
            key={`${cardIndex}-${pos}`}
            className="flex items-center gap-2 rounded-xl border border-card-border bg-card px-3 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {pos + 1}
            </span>
            <p className="min-w-0 flex-1 text-sm text-foreground">
              {item.cards[cardIndex]}
            </p>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                disabled={disabled || pos === 0}
                onClick={() => move(pos, -1)}
                className="min-h-9 rounded-md px-2 text-xs text-muted hover:bg-primary/5 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={disabled || pos === order.length - 1}
                onClick={() => move(pos, 1)}
                className="min-h-9 rounded-md px-2 text-xs text-muted hover:bg-primary/5 disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer(order)}
        className="btn-secondary min-h-11 w-full text-sm"
      >
        이 순서로 확정
      </button>
    </div>
  );
}

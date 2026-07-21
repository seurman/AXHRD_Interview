"use client";

import type { SpeakAlongItem } from "@/lib/competency-game/types";

export function SpeakAlongGame({
  item,
  disabled,
  onAnswer,
}: {
  item: SpeakAlongItem;
  disabled?: boolean;
  onAnswer: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-base font-semibold text-foreground">{item.prompt}</p>
      <blockquote className="rounded-2xl border border-gold/30 bg-gold/5 px-4 py-5 text-sm leading-relaxed text-foreground">
        {item.script}
      </blockquote>
      <p className="text-xs text-muted">{item.tip}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onAnswer}
        className="btn-primary min-h-11 w-full text-sm"
      >
        따라 말했어요
      </button>
    </div>
  );
}

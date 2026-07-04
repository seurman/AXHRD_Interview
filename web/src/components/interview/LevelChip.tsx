"use client";

import type { ChipType } from "@/types";
import { cn } from "@/lib/cn";
import { competencyLabel } from "@/lib/labels";

const CHIP_SYMBOL: Record<ChipType, string> = {
  pass: "♩",
  attempt: "♪",
  downgrade: "♭",
};

const CHIP_COLOR: Record<ChipType, string> = {
  pass: "text-success border-success/40 bg-success/10",
  attempt: "text-accent border-accent/40 bg-accent/10",
  downgrade: "text-warning border-warning/40 bg-warning/10",
};

interface LevelChipProps {
  competency: string;
  level: number;
  chipType: ChipType;
  feedback?: string;
  index: number;
}

export function LevelChip({
  competency,
  level,
  chipType,
  feedback,
  index,
}: LevelChipProps) {
  return (
    <div
      style={{ animationDelay: `${index * 80}ms` }}
      className={cn(
        "animate-note-pop flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
        CHIP_COLOR[chipType]
      )}
    >
      <span className="text-lg leading-none">{CHIP_SYMBOL[chipType]}</span>
      <span className="font-medium">L{level}</span>
      <span className="text-slate-400">·</span>
      <span>{competencyLabel(competency)}</span>
      {feedback && (
        <span className="ml-1 hidden text-xs text-slate-400 sm:inline">
          — {feedback}
        </span>
      )}
    </div>
  );
}

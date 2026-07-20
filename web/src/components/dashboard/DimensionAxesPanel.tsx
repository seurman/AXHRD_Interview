"use client";

import { ANSWER_DIMENSION_KEYS } from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";
import { InteractivePercentileBars } from "@/components/charts/InteractivePercentileBars";

/** 6축 답변 지표 — 인터랙티브 바 (호버 툴팁) */
export function DimensionAxesPanel({
  values,
  emptyHint,
}: {
  values: Record<string, number> | null;
  emptyHint?: string;
}) {
  const hasData = values != null;

  return (
    <div className="space-y-2">
      <InteractivePercentileBars
        fill="var(--color-gold)"
        items={ANSWER_DIMENSION_KEYS.map((key) => {
          const raw = values?.[key] ?? 0;
          const pct = Math.round(Math.min(100, Math.max(0, raw * 100)));
          return {
            id: key,
            label: dimensionLabel(key),
            value: pct,
            assessed: hasData,
          };
        })}
      />
      {!hasData && emptyHint ? (
        <p className="text-center text-xs text-muted">{emptyHint}</p>
      ) : null}
    </div>
  );
}

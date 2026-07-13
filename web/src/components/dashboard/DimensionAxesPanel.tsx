"use client";

import { ANSWER_DIMENSION_KEYS } from "@/lib/interview/answer-dimensions";
import { dimensionLabel } from "@/lib/labels";

/** 6축 답변 지표 — 데이터 없어도 축 프레임(0%)을 항상 표시 */
export function DimensionAxesPanel({
  values,
  emptyHint,
}: {
  values: Record<string, number> | null;
  emptyHint?: string;
}) {
  const hasData = values != null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {ANSWER_DIMENSION_KEYS.map((key) => {
          const raw = values?.[key] ?? 0;
          const pct = Math.round(Math.min(100, Math.max(0, raw * 100)));
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className={hasData ? "text-muted" : "text-muted/80"}>
                  {dimensionLabel(key)}
                </span>
                <span
                  className={
                    hasData ? "font-medium text-foreground" : "font-medium text-muted/60"
                  }
                >
                  {hasData ? `${pct}%` : "—"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background ring-1 ring-inset ring-card-border/60">
                <div
                  className={`h-full rounded-full transition-all ${
                    hasData ? "bg-gold" : "bg-muted/25"
                  }`}
                  style={{ width: `${hasData ? pct : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {!hasData && emptyHint && (
        <p className="text-center text-xs text-muted">{emptyHint}</p>
      )}
    </div>
  );
}

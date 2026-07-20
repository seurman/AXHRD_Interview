"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/cn";

type Props = {
  labels: string[];
  selected?: number;
  onSelect: (v: number) => void;
  tone?: "current" | "importance";
  disabled?: boolean;
};

/**
 * Gallup-inspired continuum: endpoint labels + prominent 1–5 selectors.
 * Radix RadioGroup + 기존 dx-scale 카드형 룩.
 */
export function ScaleContinuum({
  labels,
  selected,
  onSelect,
  tone = "current",
  disabled,
}: Props) {
  const activeRing = tone === "importance" ? "dx-scale__opt--imp" : "dx-scale__opt--cur";

  return (
    <RadioGroup
      value={selected != null ? String(selected) : undefined}
      onValueChange={(v) => onSelect(Number(v))}
      disabled={disabled}
      className="dx-scale gap-0"
      aria-label="응답 척도"
    >
      <div className="dx-scale__ends" aria-hidden>
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      <div className="dx-scale__track">
        {labels.map((lbl, idx) => {
          const v = idx + 1;
          const active = selected === v;
          return (
            <label
              key={`${tone}-${v}`}
              className={cn(
                "dx-scale__opt cursor-pointer",
                active && `dx-scale__opt--on ${activeRing}`,
                disabled && "pointer-events-none opacity-50",
              )}
            >
              <RadioGroupItem value={String(v)} className="sr-only" aria-label={`${v}. ${lbl}`} />
              <span className="dx-scale__num font-[family-name:var(--font-outfit)]">{v}</span>
              <span className="dx-scale__hint">{lbl}</span>
            </label>
          );
        })}
      </div>
    </RadioGroup>
  );
}

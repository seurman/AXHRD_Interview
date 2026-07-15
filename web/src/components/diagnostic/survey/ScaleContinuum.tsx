"use client";

import { motion } from "framer-motion";

type Props = {
  labels: string[];
  selected?: number;
  onSelect: (v: number) => void;
  tone?: "current" | "importance";
  disabled?: boolean;
};

/**
 * Gallup-inspired continuum: endpoint labels + prominent 1–5 selectors.
 */
export function ScaleContinuum({ labels, selected, onSelect, tone = "current", disabled }: Props) {
  const activeRing = tone === "importance" ? "dx-scale__opt--imp" : "dx-scale__opt--cur";

  return (
    <div className="dx-scale" role="radiogroup">
      <div className="dx-scale__ends" aria-hidden>
        <span>{labels[0]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
      <div className="dx-scale__track">
        {labels.map((lbl, idx) => {
          const v = idx + 1;
          const active = selected === v;
          return (
            <motion.button
              key={`${tone}-${v}`}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${v}. ${lbl}`}
              title={lbl}
              disabled={disabled}
              className={`dx-scale__opt ${active ? `dx-scale__opt--on ${activeRing}` : ""}`}
              onClick={() => onSelect(v)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 480, damping: 28 }}
            >
              <span className="dx-scale__num font-[family-name:var(--font-outfit)]">{v}</span>
              <span className="dx-scale__hint">{lbl}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

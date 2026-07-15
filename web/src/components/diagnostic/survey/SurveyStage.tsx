"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { ANONYMITY_BANNER } from "@/lib/diagnostic/constants";

type Props = {
  progress: number; // 0–100
  stepLabel: string;
  brandTitle?: string;
  meta?: string;
  children: ReactNode;
};

export function SurveyStage({ progress, stepLabel, brandTitle, meta, children }: Props) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div className="dx-stage">
      <div className="dx-stage__aurora" aria-hidden />
      <div className="dx-stage__grid" aria-hidden />

      <div className="dx-stage__inner">
        <div className="dx-trust" role="note">
          <span className="dx-trust__dot" />
          <p>{ANONYMITY_BANNER}</p>
        </div>

        <header className="dx-stage__head">
          <div className="dx-stage__brand">
            <p className="dx-eyebrow">ARC Index</p>
            {brandTitle && <h1 className="dx-stage__title">{brandTitle}</h1>}
            {meta && <p className="dx-stage__meta">{meta}</p>}
          </div>
          <div className="dx-progress" aria-label={`진행률 ${Math.round(pct)}%`}>
            <div className="dx-progress__row">
              <span className="dx-progress__label">{stepLabel}</span>
              <span className="dx-progress__pct font-[family-name:var(--font-outfit)]">
                {Math.round(pct)}%
              </span>
            </div>
            <div className="dx-progress__bar">
              <motion.div
                className="dx-progress__fill"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 24 }}
              />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">{children}</AnimatePresence>
      </div>
    </div>
  );
}

export function SurveyCard({
  children,
  cardKey,
  className = "",
}: {
  children: ReactNode;
  cardKey: string;
  className?: string;
}) {
  return (
    <motion.div
      key={cardKey}
      className={`dx-card ${className}`}
      initial={{ opacity: 0, y: 18, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

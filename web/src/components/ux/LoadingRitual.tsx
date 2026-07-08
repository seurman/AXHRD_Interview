"use client";

import { useEffect, useMemo, useState } from "react";
import { competencyLabel } from "@/lib/labels";
import {
  ritualStatusLabel,
  slidesForVariant,
  type RitualVariant,
} from "@/lib/ux/loading-ritual-content";

type Props = {
  variant?: RitualVariant;
  /** 면접 중이면 해당 역량 팁을 우선 노출 */
  competencyCode?: string | null;
  className?: string;
  compact?: boolean;
};

const ROTATE_MS = 4500;

export function LoadingRitual({
  variant = "interview",
  competencyCode,
  className = "",
  compact = false,
}: Props) {
  const slides = useMemo(() => {
    const all = slidesForVariant(variant);
    if (!competencyCode) return all;
    const preferred = all.filter(
      (s) => s.kind === "tip" && s.competency === competencyCode
    );
    const rest = all.filter(
      (s) => !(s.kind === "tip" && s.competency === competencyCode)
    );
    return preferred.length ? [...preferred, ...rest] : all;
  }, [variant, competencyCode]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [variant, competencyCode]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const slide = slides[index] ?? slides[0];
  const status = ritualStatusLabel(variant);

  return (
    <div
      className={`loading-ritual flex flex-col items-center text-center ${
        compact ? "gap-3 py-4" : "gap-5 py-8"
      } ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-ritual-hourglass" aria-hidden>
        <span className="loading-ritual-sand" />
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">{status}</p>
        <p className="mt-1 text-xs text-muted">잠시만 기다려 주세요 · 화면은 계속 움직입니다</p>
      </div>

      {slide && (
        <div
          key={`${slide.kind}-${index}`}
          className={`loading-ritual-card w-full max-w-md rounded-2xl border px-5 py-4 text-left ${
            slide.kind === "jam"
              ? "border-gold/30 bg-gold/5"
              : "border-primary/20 bg-primary/5"
          }`}
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                slide.kind === "jam"
                  ? "bg-gold/20 text-gold"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {slide.kind === "jam" ? "Jam · 호흡" : "Tip · 역량"}
            </span>
            {slide.kind === "tip" && slide.competency && (
              <span className="text-[10px] text-muted">
                {competencyLabel(slide.competency)}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">{slide.title}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{slide.body}</p>
        </div>
      )}

      {slides.length > 1 && (
        <div className="flex gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === index ? "bg-primary" : "bg-primary/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

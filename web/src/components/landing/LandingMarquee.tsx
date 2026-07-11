"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/** 제품명 마퀴 — 시각적 리듬만, 클릭 없음 */
export function LandingMarquee() {
  const { dict } = useI18n();
  const items = [...dict.home.marquee, ...dict.home.marquee];

  return (
    <div className="lp-marquee" aria-hidden>
      <div className="lp-marquee-track">
        {items.map((word, i) => (
          <span key={`${word}-${i}`} className="lp-marquee-item">
            {word}
            <span className="lp-marquee-dot" />
          </span>
        ))}
      </div>
    </div>
  );
}

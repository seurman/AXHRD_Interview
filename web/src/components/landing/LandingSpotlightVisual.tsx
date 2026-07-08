"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/** 스포트라이트 — 근거 인용 + 점수 UI 모사(스톡 사진 대체) */
export function LandingSpotlightVisual() {
  const { dict } = useI18n();
  const s = dict.home.spotlightVisual;

  return (
    <div className="lp-spotlight-mock" aria-hidden>
      <div className="lp-spotlight-mock-card">
        <p className="lp-spotlight-mock-label">{s.scoreLabel}</p>
        <p className="lp-spotlight-mock-score">
          {s.score}
          <span>{s.scoreUnit}</span>
        </p>
        <div className="lp-spotlight-mock-bars">
          {s.dimensions.map((d) => (
            <div key={d.label} className="lp-spotlight-mock-bar-row">
              <span>{d.label}</span>
              <div>
                <span style={{ width: `${d.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <blockquote className="lp-spotlight-mock-quote">
        <p>&ldquo;{s.quote}&rdquo;</p>
        <footer>{s.quoteSource}</footer>
      </blockquote>
    </div>
  );
}

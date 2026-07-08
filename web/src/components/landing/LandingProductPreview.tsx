"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/** 히어로 우측 — 실제 제품 UI를 CSS로 모사한 프레임(스톡 사진 대체) */
export function LandingProductPreview() {
  const { dict } = useI18n();
  const p = dict.home.preview;

  return (
    <div className="lp-product-stage" aria-hidden>
      <div className="lp-product-glow" />
      <div className="lp-product-frame lp-product-frame--main">
        <div className="lp-product-chrome">
          <span className="lp-product-dot" />
          <span className="lp-product-dot" />
          <span className="lp-product-dot" />
          <span className="lp-product-chrome-title">{p.interview.label}</span>
        </div>
        <div className="lp-product-body">
          <div className="lp-product-meta">
            <span className="lp-product-badge">{p.interview.competency}</span>
            <span className="lp-product-level">{p.interview.level}</span>
          </div>
          <p className="lp-product-question">{p.interview.question}</p>
          <div className="lp-product-chips">
            {p.interview.chips.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="lp-product-wave">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      </div>

      <div className="lp-product-frame lp-product-frame--side">
        <div className="lp-product-chrome lp-product-chrome--sm">
          <span className="lp-product-chrome-title">{p.dashboard.label}</span>
        </div>
        <div className="lp-product-body lp-product-body--compact">
          {p.dashboard.rows.map((row) => (
            <div key={row.label} className="lp-product-row">
              <span className="lp-product-row-label">{row.label}</span>
              <div className="lp-product-bar">
                <span style={{ width: `${row.pct}%` }} />
              </div>
              <span className="lp-product-row-pct">{row.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

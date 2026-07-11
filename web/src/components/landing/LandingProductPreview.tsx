"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/** 히어로 — 면접 세션 + 역량 트리 (간결한 2레이어) */
export function LandingProductPreview() {
  const { dict } = useI18n();
  const p = dict.home.preview;

  return (
    <div className="lp-hero-visual">
      <div className="lp-product-stage lp-product-stage--clean" aria-hidden>
        <div className="lp-product-glow" />

        <div className="lp-product-frame lp-product-frame--main">
          <div className="lp-product-chrome">
            <span className="lp-product-dot" />
            <span className="lp-product-dot" />
            <span className="lp-product-dot" />
            <span className="lp-product-chrome-title">{p.interview.label}</span>
            <span className="lp-product-session">{p.interview.sessionTitle}</span>
          </div>
          <div className="lp-product-body">
            <div className="lp-product-status-row">
              <span className="lp-product-live">
                <span className="lp-product-live-dot" />
                {p.interview.recording}
              </span>
              <span className="lp-product-tag lp-product-tag--gold">{p.interview.chips[0]}</span>
            </div>
            <p className="lp-product-question">{p.interview.question}</p>
            <div className="lp-product-recorder">
              <span className="lp-product-mic" />
              <div className="lp-product-wave">
                <span /><span /><span /><span /><span /><span /><span />
              </div>
            </div>
          </div>
        </div>

        <div className="lp-product-frame lp-product-frame--side">
          <div className="lp-product-chrome lp-product-chrome--sm">
            <span className="lp-product-chrome-title">{p.dashboard.label}</span>
            <span className="lp-product-theta">{p.dashboard.theta}</span>
          </div>
          <div className="lp-product-body lp-product-body--compact">
            {p.dashboard.rows.map((row) => (
              <div key={row.label} className="lp-product-row">
                <div className="lp-product-row-head">
                  <span className="lp-product-row-label">{row.label}</span>
                  <span className="lp-product-row-delta">{row.delta}</span>
                </div>
                <div className="lp-product-row-barline">
                  <div className="lp-product-bar">
                    <span style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="lp-product-row-pct">{row.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

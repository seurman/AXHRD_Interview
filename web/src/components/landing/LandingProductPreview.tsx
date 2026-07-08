"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

/** 히어로 우측 — 면접 세션 + 스킬 트리 + 피드백 3레이어 제품 UI */
export function LandingProductPreview() {
  const { dict } = useI18n();
  const p = dict.home.preview;

  return (
    <div className="lp-hero-visual">
      <div className="lp-product-stage" aria-hidden>
        <div className="lp-product-glow" />

        {/* 피드백 카드 — 뒤 레이어 */}
        <div className="lp-product-frame lp-product-frame--back">
          <div className="lp-product-chrome lp-product-chrome--sm">
            <span className="lp-product-chrome-title">{p.feedback.label}</span>
            <span className="lp-product-score-pill">{p.feedback.score}/5</span>
          </div>
          <div className="lp-product-body lp-product-body--compact">
            <p className="lp-product-feedback-quote">{p.feedback.quote}</p>
            <p className="lp-product-feedback-note">{p.feedback.note}</p>
          </div>
        </div>

        {/* 메인 면접 세션 */}
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
              <span className="lp-product-tag lp-product-tag--accent">{p.interview.chips[1]}</span>
            </div>

            <div className="lp-product-meta">
              <span className="lp-product-badge">
                {p.interview.competency} · {p.interview.level}
              </span>
              <span className="lp-product-level">{p.interview.itemProgress}</span>
            </div>

            <p className="lp-product-question">{p.interview.question}</p>

            <div className="lp-product-resume">
              <p className="lp-product-resume-label">{p.interview.resumeLabel}</p>
              <p className="lp-product-resume-quote">{p.interview.resumeQuote}</p>
            </div>

            <div className="lp-product-chip-row">
              {p.chipHistory.map((chip) => (
                <span
                  key={chip.label}
                  className={`lp-product-chip lp-product-chip--${chip.tone}`}
                >
                  <span>{chip.symbol}</span> {chip.label}
                </span>
              ))}
            </div>

            <div className="lp-product-chips">
              {p.interview.chips.slice(2).map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>

            <div className="lp-product-recorder">
              <span className="lp-product-mic" />
              <div className="lp-product-wave">
                <span /><span /><span /><span /><span /><span /><span />
              </div>
            </div>
          </div>
        </div>

        {/* 역량 스킬 트리 */}
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
            <p className="lp-product-legend">{p.dashboard.legend}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

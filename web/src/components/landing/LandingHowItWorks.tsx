"use client";

import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function LandingHowItWorks() {
  const { dict } = useI18n();
  const w = dict.home.howItWorks;
  const [active, setActive] = useState(0);
  const step = w.steps[active];

  return (
    <section className="lp-flow">
      <div className="lp-shell">
        <Reveal className="lp-section-head">
          <p className="lp-kicker lp-kicker--ink">{w.eyebrow}</p>
          <h2 className="lp-h2">{w.title}</h2>
        </Reveal>

        <div className="lp-flow-layout">
          <div className="lp-flow-rail" role="tablist" aria-label={w.title}>
            {w.steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={active === i}
                className={`lp-flow-tab${active === i ? " lp-flow-tab--active" : ""}`}
                onClick={() => setActive(i)}
              >
                <span className="lp-flow-num">{s.num}</span>
                <span className="lp-flow-tab-label">{s.title}</span>
              </button>
            ))}
          </div>

          <Reveal key={active} className="lp-flow-panel">
            <h3 className="lp-flow-panel-title">{step.title}</h3>
            <p className="lp-flow-panel-desc">{step.desc}</p>
            <ul className="lp-flow-points">
              {step.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

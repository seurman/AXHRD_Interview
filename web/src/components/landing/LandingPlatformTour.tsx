"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { productIntroHref } from "@/lib/landing/products";

export function LandingPlatformTour() {
  const { dict } = useI18n();
  const t = dict.home.platformTour;
  const [tab, setTab] = useState(0);
  const current = t.tabs[tab];

  return (
    <section className="lp-tour">
      <div className="lp-shell">
        <Reveal className="lp-section-head">
          <p className="lp-kicker lp-kicker--ink">{t.eyebrow}</p>
          <h2 className="lp-h2">{t.title}</h2>
        </Reveal>

        <div className="lp-tour-tabs" role="tablist">
          {t.tabs.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === i}
              className={`lp-tour-tab${tab === i ? " lp-tour-tab--active" : ""}`}
              onClick={() => setTab(i)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Reveal key={current.id}>
          <div className="lp-tour-panel">
            <div className="lp-tour-panel-head">
              <h3>{current.headline}</h3>
              <Link
                href={productIntroHref(current.id === "personal" ? "discover" : "organizations")}
                className="lp-ed-link group"
              >
                {current.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="lp-tour-steps">
              {current.steps.map((step) => (
                <article key={step.step} className="lp-tour-step">
                  <p className="lp-tour-step-num">{step.step}</p>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

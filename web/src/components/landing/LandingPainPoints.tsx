"use client";

import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function LandingPainPoints() {
  const { dict } = useI18n();
  const p = dict.home.painPoints;

  return (
    <section className="lp-pain">
      <div className="lp-shell">
        <Reveal className="lp-pain-head">
          <p className="lp-kicker lp-kicker--ink">{p.eyebrow}</p>
          <h2 className="lp-h2">{p.title}</h2>
          <p className="lp-lede">{p.subtitle}</p>
        </Reveal>

        <div className="lp-pain-grid">
          {p.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.05}>
              <article className="lp-pain-card">
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="lp-pain-closing">{p.closing}</p>
        </Reveal>
      </div>
    </section>
  );
}

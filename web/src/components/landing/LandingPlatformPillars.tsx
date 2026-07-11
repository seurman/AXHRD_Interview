"use client";

import { Building2, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Reveal } from "@/components/ui/Reveal";

/** 개인 vs 기관 제품 여정 */
export function LandingPlatformPillars() {
  const { dict } = useI18n();
  const p = dict.home.pillars;

  return (
    <section className="lp-section lp-section--paper">
      <div className="lp-shell">
        <Reveal className="lp-section-head">
          <p className="lp-kicker lp-kicker--ink">{p.eyebrow}</p>
          <h2 className="lp-h2">{p.title}</h2>
          <p className="lp-lede">{p.subtitle}</p>
        </Reveal>
        <div className="lp-pillar-grid">
          <Reveal>
            <article className="lp-pillar lp-pillar--personal">
              <header className="lp-pillar-head">
                <span className="lp-pillar-icon">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <h3>{p.personal.label}</h3>
                  <p>{p.personal.desc}</p>
                </div>
              </header>
              <ul className="lp-pillar-list">
                {p.personal.items.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.desc}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
          <Reveal delay={0.06}>
            <article className="lp-pillar lp-pillar--org">
              <header className="lp-pillar-head">
                <span className="lp-pillar-icon lp-pillar-icon--org">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <h3>{p.org.label}</h3>
                  <p>{p.org.desc}</p>
                </div>
              </header>
              <ul className="lp-pillar-list">
                {p.org.items.map((item) => (
                  <li key={item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.desc}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

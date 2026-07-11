"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function LandingSocialProof() {
  const { dict } = useI18n();
  const s = dict.home.socialProof;

  return (
    <section className="lp-social" aria-labelledby="lp-social-title">
      <div className="lp-shell">
        <p id="lp-social-title" className="lp-kicker lp-kicker--ink">
          {s.eyebrow}
        </p>

        <div className="lp-social-stats">
          {s.stats.map((stat) => (
            <div key={stat.label} className="lp-social-stat">
              <p className="lp-social-stat-value">{stat.value}</p>
              <p className="lp-social-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="lp-social-orgs">
          {s.orgs.map((org) => (
            <span key={org} className="lp-social-org">
              {org}
            </span>
          ))}
          <span className="lp-social-org">{s.orgsMore}</span>
        </div>
      </div>
    </section>
  );
}

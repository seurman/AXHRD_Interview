"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function LandingLatestUpdates() {
  const { dict } = useI18n();
  const u = dict.home.updates;

  return (
    <section className="lp-updates" aria-labelledby="lp-updates-title">
      <div className="lp-shell">
        <div className="lp-updates-header">
          <p className="lp-kicker lp-kicker--ink">{u.eyebrow}</p>
          <h2 id="lp-updates-title" className="lp-h2">
            {u.title}
          </h2>
        </div>

        <div className="lp-updates-list">
          {u.items.map((item) => (
            <div key={item.title} className="lp-update-item">
              <span
                className={
                  item.badge === "UPDATE"
                    ? "lp-update-badge lp-update-badge--update"
                    : "lp-update-badge"
                }
              >
                {item.badge}
              </span>
              <div>
                <p className="lp-update-title">{item.title}</p>
                <p className="lp-update-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

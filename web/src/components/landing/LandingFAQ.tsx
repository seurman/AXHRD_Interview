"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function LandingFAQ() {
  const { dict } = useI18n();
  const f = dict.home.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="lp-faq" aria-labelledby="lp-faq-title">
      <div className="lp-shell">
        <div className="lp-faq-header">
          <p className="lp-kicker lp-kicker--ink">{f.eyebrow}</p>
          <h2 id="lp-faq-title" className="lp-h2">
            {f.title}
          </h2>
        </div>

        <div className="lp-faq-list">
          {f.items.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q} className="lp-faq-item" data-open={open}>
                <button
                  type="button"
                  className="lp-faq-question"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                >
                  <span>{item.q}</span>
                  <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
                </button>
                {open && <p className="lp-faq-answer">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

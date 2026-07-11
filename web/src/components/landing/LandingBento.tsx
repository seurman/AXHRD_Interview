"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Activity,
  BarChart3,
  FileText,
  Layers,
  Mic2,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Reveal } from "@/components/ui/Reveal";
import {
  LANDING_PRODUCT_ORDER,
  landingProductHref,
  type LandingProductKey,
} from "@/lib/landing/hrefs";
import { useNavSession } from "@/components/layout/NavSessionProvider";

const ICONS: Record<LandingProductKey, typeof Sparkles> = {
  discover: Sparkles,
  resumeReview: FileText,
  interview: Mic2,
  cards: Layers,
  tracking: BarChart3,
  diagnostic: Activity,
};

const BENTO_CLASS: Record<LandingProductKey, string> = {
  discover: "lp-bento-card--discover",
  resumeReview: "lp-bento-card--resume",
  interview: "lp-bento-card--interview",
  cards: "lp-bento-card--cards",
  tracking: "lp-bento-card--tracking",
  diagnostic: "lp-bento-card--diagnostic",
};

export function LandingBento() {
  const { dict } = useI18n();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const h = dict.home;

  return (
    <section className="lp-bento-section" aria-labelledby="lp-bento-heading">
      <div className="lp-shell">
        <Reveal className="lp-bento-head">
          <p id="lp-bento-heading" className="lp-bento-label">
            {h.bento.label}
          </p>
        </Reveal>
        <div className="lp-bento">
          {LANDING_PRODUCT_ORDER.map((key, i) => {
            const Icon = ICONS[key];
            const gallery = h.gallery.items[i];
            const feature = h.features[key];
            const href = landingProductHref(key, trialOnly);

            return (
              <Reveal key={key} delay={i * 0.03}>
                <Link
                  href={href}
                  className={`lp-bento-card ${BENTO_CLASS[key]} group`}
                >
                  <div className="lp-bento-card-glow" aria-hidden />
                  <div className="lp-bento-card-top">
                    <span className="lp-bento-num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="lp-bento-icon">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  </div>
                  <p className="lp-bento-kicker">{gallery?.kicker ?? key}</p>
                  <h3 className="lp-bento-title">{feature.title}</h3>
                  <p className="lp-bento-tag">{gallery?.desc ?? feature.desc}</p>
                  <div className="lp-bento-mock" aria-hidden>
                    {(gallery?.mock ?? feature.chips.slice(0, 2)).map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </div>
                  <span className="lp-bento-action">
                    {h.bento.open}
                    <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

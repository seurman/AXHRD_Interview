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
import {
  LANDING_PRODUCT_ORDER,
  type LandingProductKey,
} from "@/lib/landing/product-keys";
import { landingProductHref } from "@/lib/landing/hrefs";
import { useNavSession } from "@/components/layout/NavSessionProvider";

const ICONS: Record<LandingProductKey, typeof Sparkles> = {
  discover: Sparkles,
  resumeReview: FileText,
  interview: Mic2,
  cards: Layers,
  tracking: BarChart3,
  diagnostic: Activity,
};

const TONE: Record<LandingProductKey, string> = {
  discover: "violet",
  resumeReview: "sky",
  interview: "navy",
  cards: "amber",
  tracking: "emerald",
  diagnostic: "teal",
};

export function LandingProductRail() {
  const { dict } = useI18n();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const h = dict.home;

  return (
    <section className="lp-rail-section" aria-labelledby="lp-rail-title">
      <div className="lp-shell lp-rail-header">
        <div>
          <h2 id="lp-rail-title" className="lp-rail-title">
            {h.rail.title}
          </h2>
          <p className="lp-rail-sub">{h.rail.subtitle}</p>
        </div>
        <p className="lp-rail-hint">{h.rail.hint}</p>
      </div>

      <div className="lp-rail-scroll" role="list">
        {LANDING_PRODUCT_ORDER.map((key, i) => {
          const Icon = ICONS[key];
          const gallery = h.gallery.items[i];
          const feature = h.features[key];
          const href = landingProductHref(key, trialOnly);
          const tone = TONE[key];

          return (
            <Link
              key={key}
              href={href}
              role="listitem"
              className={`lp-rail-card lp-rail-card--${tone} group`}
            >
              <div className="lp-rail-card-art" aria-hidden>
                <div className="lp-rail-card-art-inner">
                  {key === "discover" && (
                    <>
                      <span className="lp-rail-discover-card" />
                      <span className="lp-rail-discover-card lp-rail-discover-card--b" />
                      <span className="lp-rail-discover-card lp-rail-discover-card--c" />
                    </>
                  )}
                  {key === "resumeReview" && (
                    <div className="lp-rail-score">
                      <span>{gallery?.mock[0] ?? "82"}</span>
                    </div>
                  )}
                  {key === "interview" && (
                    <div className="lp-rail-wave">
                      {Array.from({ length: 12 }).map((_, j) => (
                        <span key={j} style={{ height: `${30 + (j % 4) * 14}%` }} />
                      ))}
                    </div>
                  )}
                  {key === "cards" && (
                    <div className="lp-rail-stack">
                      <span />
                      <span />
                    </div>
                  )}
                  {key === "tracking" && (
                    <div className="lp-rail-bars">
                      {[68, 42, 85].map((w) => (
                        <span key={w}>
                          <i style={{ width: `${w}%` }} />
                        </span>
                      ))}
                    </div>
                  )}
                  {key === "diagnostic" && (
                    <div className="lp-rail-radar">
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                </div>
              </div>
              <div className="lp-rail-card-body">
                <span className="lp-rail-card-icon">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="lp-rail-card-kicker">{gallery?.kicker}</p>
                <h3 className="lp-rail-card-name">{feature.title}</h3>
                <span className="lp-rail-card-go">
                  {h.rail.open}
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

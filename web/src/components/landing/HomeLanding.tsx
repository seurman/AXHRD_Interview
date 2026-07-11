"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LandingProductPreview } from "@/components/landing/LandingProductPreview";
import { LandingEditorialChapters } from "@/components/landing/LandingEditorialChapters";
import { LandingEditorialFinale } from "@/components/landing/LandingEditorialFinale";
import { landingStartHref } from "@/lib/landing/hrefs";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";

export function HomeLanding() {
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const { dict } = useI18n();
  const h = dict.home;

  const startHref = landingStartHref(loggedIn, trialOnly);
  const startLabel = loggedIn
    ? trialOnly
      ? h.hero.ctaTrial
      : h.hero.ctaStartLoggedIn
    : h.hero.ctaPersonal;

  return (
    <div className="lp lp--editorial">
      <section className="lp-hero lp-hero--editorial">
        <div className="lp-shell lp-ed-hero-grid">
          <div className="lp-ed-hero-copy">
            <p className="lp-ed-kicker">{h.hero.eyebrow}</p>
            <h1 className="lp-ed-headline">
              {h.hero.titleLine1}
              <br />
              <span className="lp-ed-headline-accent">{h.hero.titleHighlight}</span>
            </h1>
            <p className="lp-ed-lead">{h.hero.subtitle}</p>
            <div className="lp-hero-actions">
              <Link href={startHref} className="lp-btn-primary lp-btn-ink">
                {startLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo" className="lp-btn-ghost lp-btn-ghost--ink">
                {h.hero.ctaDemo}
              </Link>
            </div>
          </div>

          <LandingProductPreview />
        </div>
      </section>

      <LandingEditorialChapters />

      <LandingEditorialFinale />
    </div>
  );
}

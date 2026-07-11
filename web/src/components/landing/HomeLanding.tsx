"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LandingProductPreview } from "@/components/landing/LandingProductPreview";
import { LandingProductRail } from "@/components/landing/LandingProductRail";
import { LandingAudienceDoors } from "@/components/landing/LandingAudienceDoors";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import { LandingSegmentPreview } from "@/components/landing/LandingSegmentPreview";
import { LandingLatestUpdates } from "@/components/landing/LandingLatestUpdates";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
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
    <div className="lp">
      <section className="lp-hero">
        <div className="lp-hero-mesh" aria-hidden />
        <div className="lp-hero-orbs" aria-hidden>
          <span className="lp-hero-orb lp-hero-orb--a" />
          <span className="lp-hero-orb lp-hero-orb--b" />
          <span className="lp-hero-orb lp-hero-orb--c" />
        </div>

        <div className="lp-shell lp-hero-grid">
          <div className="lp-hero-copy lp-hero-copy--intro">
            <p className="lp-kicker">{h.hero.eyebrow}</p>
            <p className="lp-brand" aria-hidden>
              {h.hero.brand}
            </p>
            <h1 className="lp-display">
              {h.hero.titleLine1}
              <br />
              <em className="lp-display-em">{h.hero.titleHighlight}</em>
            </h1>
            <p className="lp-lead">{h.hero.subtitle}</p>
            <div className="lp-hero-actions">
              <Link href={startHref} className="lp-btn-primary">
                {startLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/demo" className="lp-btn-ghost">
                {h.hero.ctaDemo}
              </Link>
            </div>
          </div>

          <LandingProductPreview />

          <div className="lp-hero-copy lp-hero-copy--actions lp-hero-aside">
            <p className="lp-hero-aside-text">{h.hero.aside}</p>
            <Link href="/products/organizations" className="lp-hero-aside-link group">
              {h.hero.ctaEnterprise}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <LandingSocialProof />

      <LandingProductRail />

      <LandingSegmentPreview />

      <LandingAudienceDoors />

      <LandingLatestUpdates />

      <LandingFAQ />
    </div>
  );
}

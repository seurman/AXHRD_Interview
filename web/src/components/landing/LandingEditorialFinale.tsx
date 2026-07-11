"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { landingStartHref } from "@/lib/landing/hrefs";
import { productIntroHref } from "@/lib/landing/products";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";

export function LandingEditorialFinale() {
  const { dict } = useI18n();
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const h = dict.home;

  const startHref = landingStartHref(loggedIn, trialOnly);
  const startLabel = loggedIn ? h.cta.buttonLoggedIn : h.cta.button;

  return (
    <section className="lp-ed-finale">
      <div className="lp-shell lp-ed-finale-inner">
        <h2 className="lp-ed-finale-title">{h.cta.title}</h2>
        <p className="lp-ed-finale-sub">{h.cta.subtitle}</p>
        <div className="lp-ed-finale-actions">
          <Link href={startHref} className="lp-btn-primary lp-btn-ink">
            {startLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={productIntroHref("organizations")} className="lp-ed-link group">
            {h.doors.org.cta}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <Link href="/pricing" className="lp-ed-finale-pricing">
          {h.cta.pricing}
        </Link>
      </div>
    </section>
  );
}

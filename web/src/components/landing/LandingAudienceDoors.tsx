"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { landingStartHref } from "@/lib/landing/hrefs";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";

export function LandingAudienceDoors() {
  const { dict } = useI18n();
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const d = dict.home.doors;
  const personalHref = landingStartHref(loggedIn, trialOnly);

  return (
    <section className="lp-doors">
      <div className="lp-shell lp-doors-grid">
        <Link href={personalHref} className="lp-door lp-door--you group">
          <p className="lp-door-label">{d.personal.label}</p>
          <h2 className="lp-door-title">{d.personal.title}</h2>
          <span className="lp-door-link">
            {d.personal.cta}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
        <Link href="/products/organizations" className="lp-door lp-door--org group">
          <p className="lp-door-label">{d.org.label}</p>
          <h2 className="lp-door-title">{d.org.title}</h2>
          <span className="lp-door-link">
            {d.org.cta}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </section>
  );
}

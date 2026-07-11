"use client";

import Link from "next/link";
import { ArrowRight, Building2, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Reveal } from "@/components/ui/Reveal";
import { landingStartHref } from "@/lib/landing/hrefs";
import { useLoggedIn, useNavSession } from "@/components/layout/NavSessionProvider";

export function LandingPathSplit() {
  const { dict } = useI18n();
  const loggedIn = useLoggedIn();
  const nav = useNavSession();
  const trialOnly = nav?.trialOnly ?? false;
  const p = dict.home.paths;
  const personalHref = landingStartHref(loggedIn, trialOnly);

  return (
    <section className="lp-paths">
      <div className="lp-shell lp-paths-grid">
        <Reveal>
          <Link href={personalHref} className="lp-path-card lp-path-card--personal group">
            <div className="lp-path-card-bg" aria-hidden />
            <span className="lp-path-icon">
              <UserRound className="h-5 w-5" />
            </span>
            <p className="lp-path-label">{p.personal.label}</p>
            <h2 className="lp-path-headline">{p.personal.headline}</h2>
            <span className="lp-path-cta">
              {p.personal.cta}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </Reveal>
        <Reveal delay={0.05}>
          <Link href="/org/setup" className="lp-path-card lp-path-card--org group">
            <div className="lp-path-card-bg" aria-hidden />
            <span className="lp-path-icon">
              <Building2 className="h-5 w-5" />
            </span>
            <p className="lp-path-label">{p.org.label}</p>
            <h2 className="lp-path-headline">{p.org.headline}</h2>
            <span className="lp-path-cta">
              {p.org.cta}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

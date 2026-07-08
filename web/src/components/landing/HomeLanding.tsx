"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Mic2,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
  Target,
  TrendingUp,
  Scale,
  Check,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";

const HERO_MAIN =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1600&q=80";
const HERO_SIDE =
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80";
const SPOTLIGHT_IMG =
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1600&q=80";
const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80",
    alt: "team collaboration",
  },
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    alt: "campus career",
  },
  {
    src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
    alt: "professional interview",
  },
  {
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    alt: "workshop briefing",
  },
];

export function HomeLanding({ loggedIn }: { loggedIn: boolean }) {
  const { dict } = useI18n();
  const h = dict.home;

  const features = [
    { icon: Mic2, ...h.features.interview, href: "/interview/setup" },
    { icon: Sparkles, ...h.features.discover, href: "/discover" },
    { icon: BarChart3, ...h.features.tracking, href: "/dashboard" },
    { icon: Layers, ...h.features.cards, href: "/practice/swipe" },
  ];

  const values = [
    { icon: Shield, ...h.values.transparent },
    { icon: Target, ...h.values.adaptive },
    { icon: TrendingUp, ...h.values.growth },
    { icon: Scale, ...h.values.ncs },
  ];

  return (
    <div className="lp">
      {/* Full-viewport branded hero — edge to edge, no inset card */}
      <section className="lp-hero">
        <div className="lp-hero-mesh" aria-hidden />
        <div className="lp-hero-photos" aria-hidden>
          <div className="lp-hero-photo lp-hero-photo--a">
            <Image src={HERO_MAIN} alt="" fill sizes="40vw" priority className="object-cover" />
          </div>
          <div className="lp-hero-photo lp-hero-photo--b">
            <Image src={HERO_SIDE} alt="" fill sizes="30vw" priority className="object-cover" />
          </div>
        </div>

        <div className="lp-shell lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-kicker">{h.hero.eyebrow}</p>
            <p className="lp-brand">{h.hero.brand}</p>
            <h1 className="lp-display">
              {h.hero.titleLine1}{" "}
              <em className="lp-display-em">{h.hero.titleHighlight}</em>
            </h1>
            <p className="lp-lead">{h.hero.subtitle}</p>
            <ul className="lp-bullets">
              {h.hero.bullets.map((b) => (
                <li key={b}>
                  <span className="lp-check">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <div className="lp-hero-actions">
              <Link
                href={loggedIn ? "/interview/setup" : "/auth/register"}
                className="lp-btn-primary"
              >
                {loggedIn ? h.hero.ctaStartLoggedIn : h.hero.ctaStart}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Photo strip — real humans, not empty cards */}
      <section className="lp-gallery">
        {GALLERY.map((g, i) => (
          <div key={g.src} className={`lp-gallery-cell lp-gallery-cell--${i + 1}`}>
            <Image src={g.src} alt={g.alt} fill sizes="25vw" className="object-cover" />
          </div>
        ))}
      </section>

      <section className="lp-section">
        <div className="lp-shell">
          <Reveal className="lp-section-head">
            <p className="lp-kicker lp-kicker--ink">{h.proof.eyebrow}</p>
            <h2 className="lp-h2">{h.proof.title}</h2>
            <ul className="lp-proof-row">
              {h.proof.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-section--paper">
        <div className="lp-shell">
          <Reveal className="lp-section-head">
            <p className="lp-kicker lp-kicker--ink">{h.modules.eyebrow}</p>
            <h2 className="lp-h2">{h.modules.title}</h2>
            <p className="lp-lede">{h.modules.subtitle}</p>
          </Reveal>
          <div className="lp-feature-grid">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <Link href={f.href} className="lp-feature group">
                  <div className="lp-feature-top">
                    <span className="lp-feature-icon">
                      <f.icon className="h-5 w-5" />
                    </span>
                    <ChevronRight className="h-4 w-4 text-primary opacity-0 transition group-hover:opacity-100" />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                  <div className="lp-chips">
                    {f.chips.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-spotlight">
        <div className="lp-shell lp-spotlight-grid">
          <Reveal>
            <div className="lp-spotlight-photo">
              <Image
                src={SPOTLIGHT_IMG}
                alt={h.spotlight.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div>
              <p className="lp-kicker lp-kicker--ink">{h.spotlight.eyebrow}</p>
              <h2 className="lp-h2">{h.spotlight.title}</h2>
              <p className="lp-lede">{h.spotlight.desc}</p>
              <ul className="lp-bullets lp-bullets--ink">
                {h.spotlight.points.map((p) => (
                  <li key={p}>
                    <span className="lp-check lp-check--ink">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={loggedIn ? "/interview/setup" : "/auth/register"}
                className="lp-btn-primary lp-btn-ink mt-8"
              >
                {h.spotlight.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-shell">
          <Reveal className="lp-section-head">
            <p className="lp-kicker lp-kicker--ink">{h.values.eyebrow}</p>
            <h2 className="lp-h2">{h.values.title}</h2>
            <p className="lp-lede">{h.values.subtitle}</p>
          </Reveal>
          <div className="lp-value-grid">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.04}>
                <article className="lp-value">
                  <span className="lp-feature-icon">
                    <v.icon className="h-5 w-5" />
                  </span>
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-enterprise">
        <div className="lp-shell lp-enterprise-inner">
          <p className="lp-kicker">{h.enterprise.eyebrow}</p>
          <h2 className="lp-display lp-display--sm">{h.enterprise.title}</h2>
          <p className="lp-lead lp-lead--narrow">{h.enterprise.desc}</p>
          <Link href="/org/setup" className="lp-btn-primary mt-8">
            {h.enterprise.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="lp-closing">
        <div className="lp-shell text-center">
          <h2 className="lp-h2">{h.cta.title}</h2>
          <p className="lp-lede mx-auto">{h.cta.subtitle}</p>
          <Link
            href={loggedIn ? "/dashboard" : "/auth/register"}
            className="lp-btn-primary lp-btn-ink mt-8"
          >
            {loggedIn ? h.cta.buttonLoggedIn : h.cta.button}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

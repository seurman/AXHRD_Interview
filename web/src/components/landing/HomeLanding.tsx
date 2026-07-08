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

const HERO_IMG =
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2400&q=80";
const SPOTLIGHT_IMG =
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80";
const ENTERPRISE_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80";

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

  const stats = [
    { value: "6", label: h.stats.competencies },
    { value: "IRT", label: h.stats.adaptive },
    { value: "SaaS", label: h.stats.anytime },
  ];

  return (
    <div className="landing-page">
      {/* Full-bleed photo hero — Greenhouse-style marketing surface */}
      <section className="landing-hero">
        <Image
          src={HERO_IMG}
          alt={h.hero.imageAlt}
          fill
          priority
          sizes="100vw"
          className="landing-hero-img object-cover"
        />
        <div className="landing-hero-scrim" aria-hidden />
        <div className="landing-hero-inner">
          <p className="landing-eyebrow landing-eyebrow--on-dark">{h.hero.eyebrow}</p>
          <p className="landing-brand">{h.hero.brand}</p>
          <h1 className="landing-h1">
            {h.hero.titleLine1}
            <br />
            <span className="landing-h1-accent">{h.hero.titleHighlight}</span>
          </h1>
          <p className="landing-hero-sub">{h.hero.subtitle}</p>
          <div className="landing-hero-cta">
            <Link
              href={loggedIn ? "/interview/setup" : "/auth/register"}
              className="btn-primary px-8 py-4 text-base"
            >
              {loggedIn ? h.hero.ctaStartLoggedIn : h.hero.ctaStart}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="landing-btn-ghost">
              {h.hero.ctaDemo}
            </Link>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="landing-proof">
        <div className="landing-shell">
          <p className="landing-eyebrow">{h.proof.eyebrow}</p>
          <h2 className="landing-proof-title">{h.proof.title}</h2>
          <ul className="landing-proof-list">
            {h.proof.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="landing-proof-stats">
            {stats.map((s) => (
              <div key={s.label} className="landing-proof-stat">
                <p className="landing-proof-stat-value">{s.value}</p>
                <p className="landing-proof-stat-label">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="landing-section">
        <div className="landing-shell">
          <Reveal className="text-center">
            <p className="landing-eyebrow">{h.modules.eyebrow}</p>
            <h2 className="landing-h2">{h.modules.title}</h2>
            <p className="landing-lede mx-auto">{h.modules.subtitle}</p>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <Link href={f.href} className="landing-feature group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="landing-feature-icon">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                      {dict.common.explore} <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.desc}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {f.chips.map((chip) => (
                      <span key={chip} className="landing-chip">
                        {chip}
                      </span>
                    ))}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Spotlight with photography */}
      <section className="landing-spotlight">
        <div className="landing-shell landing-spotlight-grid">
          <Reveal>
            <div className="landing-spotlight-photo">
              <Image
                src={SPOTLIGHT_IMG}
                alt={h.spotlight.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <div>
              <p className="landing-eyebrow">{h.spotlight.eyebrow}</p>
              <h2 className="landing-h2 mt-3">{h.spotlight.title}</h2>
              <p className="landing-lede mt-4">{h.spotlight.desc}</p>
              <ul className="mt-8 space-y-3">
                {h.spotlight.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm leading-relaxed text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={loggedIn ? "/interview/setup" : "/auth/register"}
                className="btn-primary mt-10 inline-flex px-7 py-3.5 text-sm"
              >
                {h.spotlight.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Values */}
      <section className="landing-section landing-section--muted">
        <div className="landing-shell">
          <Reveal className="text-center">
            <p className="landing-eyebrow">{h.values.eyebrow}</p>
            <h2 className="landing-h2">{h.values.title}</h2>
            <p className="landing-lede mx-auto">{h.values.subtitle}</p>
            <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {h.values.trustBadges.map((badge) => (
                <span key={badge} className="landing-trust-badge">
                  {badge}
                </span>
              ))}
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.04}>
                <div className="landing-value">
                  <div className="landing-value-icon">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{v.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-lg grid-cols-3 gap-4">
            {h.values.miniStats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-primary">{s.value}</p>
                <p className="mt-1 text-[0.7rem] font-medium text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise band with photo */}
      <section className="landing-enterprise">
        <div className="landing-shell landing-enterprise-grid">
          <Reveal>
            <div>
              <p className="landing-eyebrow landing-eyebrow--on-dark">{h.enterprise.eyebrow}</p>
              <h2 className="landing-h2 landing-h2--on-dark mt-3">{h.enterprise.title}</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">
                {h.enterprise.desc}
              </p>
              <Link href="/org/setup" className="btn-gold mt-8 inline-flex">
                {h.enterprise.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="landing-enterprise-photo">
              <Image
                src={ENTERPRISE_IMG}
                alt={h.enterprise.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="landing-closing">
        <div className="landing-shell text-center">
          <Reveal>
            <h2 className="landing-h2">{h.cta.title}</h2>
            <p className="landing-lede mx-auto mt-3">{h.cta.subtitle}</p>
            <Link
              href={loggedIn ? "/dashboard" : "/auth/register"}
              className="btn-primary mt-8 px-10 py-4 text-base"
            >
              {loggedIn ? h.cta.buttonLoggedIn : h.cta.button}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

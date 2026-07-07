"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Mic2,
  Sparkles,
  Shield,
  Layers,
  Users,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function HomeLanding({ loggedIn }: { loggedIn: boolean }) {
  const { dict } = useI18n();
  const h = dict.home;

  const stats = [
    { value: "6", label: h.stats.competencies },
    { value: "IRT", label: h.stats.adaptive },
    { value: "24/7", label: h.stats.anytime },
  ];

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
  ];

  return (
    <div className="space-y-0">
      <section className="hero-premium relative px-6 py-20 sm:px-12 md:py-28">
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="section-eyebrow">{h.hero.eyebrow}</p>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {h.hero.titleLine1}
            <br />
            <span className="bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
              {h.hero.titleHighlight}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-[1.75] text-white/65 sm:text-lg">
            {h.hero.subtitle}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href={loggedIn ? "/interview/setup" : "/auth/register"} className="btn-gold">
              {loggedIn ? h.hero.ctaStartLoggedIn : h.hero.ctaStart}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-outline-gold">
              {h.hero.ctaDemo}
            </Link>
          </div>

          <div className="mx-auto mt-14 grid max-w-lg grid-cols-3 gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur"
              >
                <p className="text-2xl font-bold text-gold">{s.value}</p>
                <p className="mt-0.5 text-[0.7rem] font-medium leading-snug text-white/50">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <Reveal className="text-center">
          <p className="section-eyebrow">{h.modules.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">{h.modules.title}</h2>
          <p className="mx-auto mt-3 max-w-lg leading-relaxed text-muted">{h.modules.subtitle}</p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <Link href={f.href} className="feature-card-premium group flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/8">
                    <f.icon className="h-6 w-6 text-gold" />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                    {dict.common.explore} <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.desc}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {f.chips.map((chip) => (
                    <span key={chip} className="stat-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="rounded-[1.75rem] border border-card-border bg-gradient-to-br from-[#0c1222] to-[#141d32] px-8 py-14 text-white sm:px-12">
          <div className="text-center">
            <p className="section-eyebrow">{h.values.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{h.values.title}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
              {h.values.subtitle}
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/8 bg-white/4 p-6 text-center transition hover:border-gold/25"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
                  <v.icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="mt-4 font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <section className="py-20">
        <Reveal>
          <div className="feature-card-premium flex flex-col items-center gap-8 p-10 sm:flex-row sm:p-12">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-gold/8">
              <Users className="h-8 w-8 text-gold" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="section-eyebrow">{h.enterprise.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-bold text-foreground">{h.enterprise.title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{h.enterprise.desc}</p>
            </div>
            <Link href="/org/setup" className="btn-gold shrink-0">
              {h.enterprise.cta}
              <Zap className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="hero-premium mb-8 px-6 py-16 text-center sm:px-10">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{h.cta.title}</h2>
          <p className="mx-auto mt-3 max-w-md leading-relaxed text-white/60">{h.cta.subtitle}</p>
          <Link
            href={loggedIn ? "/dashboard" : "/auth/register"}
            className="btn-gold mt-8 px-10"
          >
            {loggedIn ? h.cta.buttonLoggedIn : h.cta.button}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </Reveal>
    </div>
  );
}

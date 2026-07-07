"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DiscoverStartButton } from "@/components/discover/DiscoverStartButton";

export function DiscoverPageContent({ loggedIn }: { loggedIn: boolean }) {
  const { dict } = useI18n();
  const d = dict.discover;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3 text-center">
        <p className="section-eyebrow">{d.eyebrow}</p>
        <h1 className="text-3xl font-bold text-foreground">{d.title}</h1>
        <p className="leading-relaxed text-muted">{d.subtitle}</p>
      </header>

      <section className="card-luxe space-y-4 p-6">
        <h2 className="font-semibold text-foreground">{d.notInterview.title}</h2>
        <ul className="space-y-2 text-sm leading-relaxed text-muted">
          {d.notInterview.items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="card-luxe space-y-3 p-6">
        <h2 className="font-semibold text-foreground">{d.methodology.title}</h2>
        <p className="text-sm leading-relaxed text-muted">{d.methodology.desc}</p>
      </section>

      {loggedIn ? (
        <DiscoverStartButton label={d.start} />
      ) : (
        <div className="text-center">
          <Link
            href="/auth/login?next=/discover"
            className="inline-block rounded-xl bg-primary px-8 py-3 font-medium text-white hover:opacity-90"
          >
            {d.loginStart}
          </Link>
        </div>
      )}

      <p className="text-center text-xs leading-relaxed text-muted">{d.footer}</p>
    </div>
  );
}

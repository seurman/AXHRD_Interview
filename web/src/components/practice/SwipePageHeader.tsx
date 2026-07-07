"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function SwipePageHeader() {
  const { dict } = useI18n();
  const s = dict.swipe;

  return (
    <header className="mb-8 text-center">
      <p className="section-eyebrow">{s.eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold text-foreground">{s.title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{s.subtitle}</p>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PersonaSwitcher } from "@/components/layout/PersonaSwitcher";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { persistPersonaPreference, type ProductPersona } from "@/lib/nav/persona";

export function PersonaDashboardHeader({
  persona,
  userName,
  level,
  actions,
}: {
  persona: ProductPersona;
  userName: string;
  level?: number | null;
  actions?: React.ReactNode;
}) {
  const { dict, locale } = useI18n();
  const p = dict.dashboard.personas[persona];
  const userSuffix = dict.common.userSuffix;

  useEffect(() => {
    persistPersonaPreference(persona);
  }, [persona]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PersonaSwitcher active={persona} />
        {actions}
      </div>
      <div>
        <p className="product-stage__kicker">{p.kicker}</p>
        <h1 className="product-stage__title !text-2xl sm:!text-3xl">{p.title}</h1>
        <p className="product-stage__lead !mt-1">
          {locale === "ko"
            ? `${userName}${userSuffix}${level != null ? ` · Lv.${level}` : ""} · ${p.subtitle}`
            : `${userName}${level != null ? ` · Lv.${level}` : ""} · ${p.subtitle}`}
        </p>
      </div>
    </div>
  );
}

export function PersonaActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <Link href={href} className={primary ? "btn-primary text-sm" : "btn-secondary text-sm"}>
      {children}
    </Link>
  );
}

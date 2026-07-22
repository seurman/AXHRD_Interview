"use client";

import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  DEFAULT_PERSONA,
  persistPersonaPreference,
  personaHomeHref,
  pathnamePersona,
  type ProductPersona,
  PRODUCT_PERSONAS,
} from "@/lib/nav/persona";

export function PersonaSwitcher({
  active,
}: {
  active?: ProductPersona | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const p = dict.dashboard.personas;
  const current = active ?? pathnamePersona(pathname) ?? DEFAULT_PERSONA;

  const labels: Record<ProductPersona, string> = {
    jobseeker: p.jobseeker.short,
    worker: p.worker.short,
    mock: p.mock.short,
  };

  return (
    <div className="workspace-switcher persona-switcher" role="tablist" aria-label={p.switcherLabel}>
      {PRODUCT_PERSONAS.map((persona) => (
        <button
          key={persona}
          type="button"
          role="tab"
          aria-selected={current === persona}
          className={`workspace-switcher__btn ${current === persona ? "workspace-switcher__btn--active" : ""}`}
          onClick={() => {
            if (persona === current) return;
            persistPersonaPreference(persona);
            router.push(personaHomeHref(persona));
          }}
        >
          {labels[persona]}
        </button>
      ))}
    </div>
  );
}

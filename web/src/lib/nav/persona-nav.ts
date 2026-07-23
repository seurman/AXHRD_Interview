import type { PrepareLabelKey } from "@/lib/platform/nav-registry";
import {
  DEFAULT_PERSONA,
  personaHomeHref,
  type ProductPersona,
} from "@/lib/nav/persona";

export type PersonaNavLink = {
  href: string;
  labelKey: PrepareLabelKey | "home";
  /** Prefer hard navigation for persona home (avoids /dashboard redirect soft-nav bugs). */
  hard?: boolean;
};

const PERSONA_PRIMARY: Record<ProductPersona, PersonaNavLink[]> = {
  jobseeker: [
    { href: personaHomeHref("jobseeker"), labelKey: "home", hard: true },
    { href: "/interview/setup", labelKey: "interview" },
    { href: "/resume-review", labelKey: "resumeReview" },
    { href: "/discover", labelKey: "discover" },
  ],
  worker: [
    { href: personaHomeHref("worker"), labelKey: "home", hard: true },
    { href: "/assessment", labelKey: "assessment" },
  ],
  mock: [
    { href: personaHomeHref("mock"), labelKey: "home", hard: true },
    { href: "/practice/game", labelKey: "game" },
    { href: "/practice/path", labelKey: "path" },
    { href: "/practice/swipe", labelKey: "cards" },
    { href: "/demo", labelKey: "trialInterview" },
  ],
};

export function personaPrimaryLinks(persona: ProductPersona | null | undefined): PersonaNavLink[] {
  return PERSONA_PRIMARY[persona ?? DEFAULT_PERSONA];
}

export function resolvePersonaHomeHref(persona: ProductPersona | null | undefined): string {
  return personaHomeHref(persona ?? DEFAULT_PERSONA);
}

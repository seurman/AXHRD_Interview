export const PRODUCT_PERSONAS = ["jobseeker", "worker", "mock"] as const;

export type ProductPersona = (typeof PRODUCT_PERSONAS)[number];

export const PERSONA_COOKIE = "axhrd_persona";
export const PERSONA_STORAGE_KEY = "axhrd-persona";
export const DEFAULT_PERSONA: ProductPersona = "jobseeker";

export function isProductPersona(value: string | null | undefined): value is ProductPersona {
  return !!value && (PRODUCT_PERSONAS as readonly string[]).includes(value);
}

export function parsePersona(value: string | null | undefined): ProductPersona | null {
  return isProductPersona(value) ? value : null;
}

export function personaHomeHref(persona: ProductPersona): string {
  return `/dashboard/${persona}`;
}

export function pathnamePersona(pathname: string): ProductPersona | null {
  const match = pathname.match(/^\/dashboard\/(jobseeker|worker|mock)(?:\/|$)/);
  return match ? (match[1] as ProductPersona) : null;
}

/** Persist preference for SSR (cookie) + client (sessionStorage). */
export function persistPersonaPreference(persona: ProductPersona) {
  try {
    sessionStorage.setItem(PERSONA_STORAGE_KEY, persona);
  } catch {
    /* ignore */
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${PERSONA_COOKIE}=${persona}; path=/; max-age=${maxAge}; samesite=lax`;
  } catch {
    /* ignore */
  }
}

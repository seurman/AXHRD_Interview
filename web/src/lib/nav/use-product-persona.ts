"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_PERSONA,
  PERSONA_COOKIE,
  PERSONA_STORAGE_KEY,
  parsePersona,
  pathnamePersona,
  type ProductPersona,
} from "@/lib/nav/persona";

function readStoredPersona(): ProductPersona | null {
  try {
    const fromSession = parsePersona(sessionStorage.getItem(PERSONA_STORAGE_KEY));
    if (fromSession) return fromSession;
  } catch {
    /* ignore */
  }
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${PERSONA_COOKIE}=([^;]+)`),
    );
    return parsePersona(match?.[1] ? decodeURIComponent(match[1]) : null);
  } catch {
    return null;
  }
}

/** Active product persona for nav + dashboard chrome. */
export function useProductPersona() {
  const pathname = usePathname();
  const fromPath = pathnamePersona(pathname);
  const [stored, setStored] = useState<ProductPersona | null>(null);

  useEffect(() => {
    setStored(readStoredPersona());
  }, [pathname]);

  const persona = useMemo(
    () => fromPath ?? stored ?? DEFAULT_PERSONA,
    [fromPath, stored],
  );

  return persona;
}

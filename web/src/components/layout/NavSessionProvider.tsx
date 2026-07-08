"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { GUEST_NAV, type NavPayload } from "@/lib/nav/client-types";

const NavSessionContext = createContext<NavPayload | null>(null);

export function NavSessionProvider({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = useState<NavPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/nav", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : GUEST_NAV))
      .then((data: NavPayload) => {
        if (!cancelled) setNav(data);
      })
      .catch(() => {
        if (!cancelled) setNav(GUEST_NAV);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <NavSessionContext.Provider value={nav}>{children}</NavSessionContext.Provider>;
}

/** null = 아직 로딩 중(비로그인 UI 기본) */
export function useNavSession(): NavPayload | null {
  return useContext(NavSessionContext);
}

export function useLoggedIn(): boolean {
  return useNavSession()?.loggedIn ?? false;
}

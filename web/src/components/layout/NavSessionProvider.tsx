"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { GUEST_NAV, type NavPayload } from "@/lib/nav/client-types";

type NavSessionContextValue = {
  nav: NavPayload | null;
  loading: boolean;
  refreshNav: () => Promise<NavPayload>;
};

const NavSessionContext = createContext<NavSessionContextValue | null>(null);

async function fetchNavPayload(): Promise<NavPayload> {
  const res = await fetch("/api/nav", {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) return GUEST_NAV;
  return (await res.json()) as NavPayload;
}

export function NavSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [nav, setNav] = useState<NavPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const navRef = useRef<NavPayload | null>(null);
  navRef.current = nav;

  const refreshNav = useCallback(async () => {
    const data = await fetchNavPayload();
    setNav(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (navRef.current === null) setLoading(true);
    fetchNavPayload()
      .then((data) => {
        if (!cancelled) {
          setNav(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNav(GUEST_NAV);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <NavSessionContext.Provider value={{ nav, loading, refreshNav }}>
      {children}
    </NavSessionContext.Provider>
  );
}

export function useNavSessionContext(): NavSessionContextValue {
  const ctx = useContext(NavSessionContext);
  if (!ctx) {
    throw new Error("useNavSessionContext must be used within NavSessionProvider");
  }
  return ctx;
}

/** null = 아직 로딩 중 */
export function useNavSession(): NavPayload | null {
  return useContext(NavSessionContext)?.nav ?? null;
}

export function useNavSessionLoading(): boolean {
  return useContext(NavSessionContext)?.loading ?? true;
}

export function useLoggedIn(): boolean {
  return useNavSession()?.loggedIn ?? false;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

/** Provider 리마운트·Strict Mode에도 헤더가 깜빡이지 않도록 세션 간 캐시 */
let navCache: NavPayload | null = null;

export function clearNavSessionCache() {
  navCache = null;
}

async function fetchNavPayload(): Promise<NavPayload> {
  const res = await fetch("/api/nav", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return GUEST_NAV;
  if (!res.ok) throw new Error(`nav ${res.status}`);
  return (await res.json()) as NavPayload;
}

function commitNav(data: NavPayload) {
  navCache = data;
  return data;
}

export function NavSessionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skipNavFetch = pathname.startsWith("/admin");
  const [nav, setNav] = useState<NavPayload | null>(() => navCache);
  const [loading, setLoading] = useState(() => navCache === null && !skipNavFetch);

  const refreshNav = useCallback(async () => {
    const data = commitNav(await fetchNavPayload());
    setNav(data);
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (skipNavFetch) {
      setLoading(false);
      return;
    }

    if (navCache) {
      setNav(navCache);
      setLoading(false);
    }

    fetchNavPayload()
      .then((data) => {
        if (!cancelled) {
          const next = commitNav(data);
          setNav(next);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          if (navCache) {
            setNav(navCache);
            setLoading(false);
          } else {
            setNav(commitNav(GUEST_NAV));
            setLoading(false);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [skipNavFetch]);

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

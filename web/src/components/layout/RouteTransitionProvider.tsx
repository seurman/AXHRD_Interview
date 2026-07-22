"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";

type RouteTransitionContextValue = {
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const RouteTransitionContext = createContext<RouteTransitionContextValue | null>(null);

export function RouteTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { dict } = useI18n();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prevPathRef = useRef(pathname);
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      setPendingHref(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref || isAdminRoute) {
      setShowOverlay(false);
      return;
    }
    const t = window.setTimeout(() => setShowOverlay(true), 220);
    return () => {
      window.clearTimeout(t);
      setShowOverlay(false);
    };
  }, [pendingHref, isAdminRoute]);

  useEffect(() => {
    if (!pendingHref) return;
    const t = window.setTimeout(() => setPendingHref(null), 12_000);
    return () => window.clearTimeout(t);
  }, [pendingHref]);

  const startNavigation = useCallback(
    (href: string) => {
      if (href === pathname) {
        setPendingHref(null);
        return;
      }
      // Soft-nav to `/` is unsafe while legacy SW drain; always hard-load home.
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin && url.pathname === "/") {
          window.location.assign(url.href);
          return;
        }
      } catch {
        /* fall through */
      }
      setPendingHref(href);
      router.prefetch(href);
    },
    [pathname, router]
  );

  const progressBar =
    pendingHref && mounted && !isAdminRoute ? (
      <div className="route-progress-bar" aria-hidden />
    ) : null;

  const overlay =
    showOverlay && pendingHref && mounted && !isAdminRoute ? (
      <div
        className="fixed inset-0 z-[95] flex items-center justify-center bg-background/55 backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="mx-4 flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-gold/25 bg-card px-8 py-6 shadow-luxe">
          <div className="loading-ritual-hourglass" aria-hidden>
            <span className="loading-ritual-sand" />
          </div>
          <p className="text-center text-sm font-medium text-foreground">
            {dict.common.navigating}
            <span className="inline-flex w-5 justify-start motion-safe:animate-pulse">…</span>
          </p>
        </div>
      </div>
    ) : null;

  return (
    <RouteTransitionContext.Provider value={{ pendingHref, startNavigation }}>
      {children}
      {mounted && progressBar ? createPortal(progressBar, document.body) : null}
      {mounted && overlay ? createPortal(overlay, document.body) : null}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const ctx = useContext(RouteTransitionContext);
  if (!ctx) {
    throw new Error("useRouteTransition must be used within RouteTransitionProvider");
  }
  return ctx;
}

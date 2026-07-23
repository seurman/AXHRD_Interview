"use client";

import { useEffect } from "react";

function shouldHardNavigate(pathname: string): boolean {
  // Marketing `/` and legacy `/dashboard` redirect both break soft-nav
  // when a stale SW or RSC redirect is involved. Persona homes use hard
  // nav too so Growth CTAs never soft-land on a broken redirect hub.
  return (
    pathname === "/" ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/jobseeker" ||
    pathname === "/dashboard/worker" ||
    pathname === "/dashboard/mock"
  );
}

/**
 * Force full document loads for fragile entry routes.
 * Legacy SW + `/dashboard` redirect soft-nav surfaced error.tsx
 * ("페이지를 불러오지 못했습니다").
 */
export function HardNavGuard() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      let url: URL;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!shouldHardNavigate(url.pathname)) return;
      if (window.location.pathname === url.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(url.href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

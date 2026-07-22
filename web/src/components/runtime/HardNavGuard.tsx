"use client";

import { useEffect } from "react";

function isSameOriginHome(href: string): boolean {
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin && url.pathname === "/";
  } catch {
    return false;
  }
}

/**
 * Force full document loads for `/`.
 * Legacy service workers corrupted App Router soft-nav to home
 * (error.tsx: "페이지를 불러오지 못했습니다"). Hard navigation bypasses
 * that path even if a stale worker is still draining.
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
      if (!href || !isSameOriginHome(href)) return;

      // Already on home — let the browser no-op / refresh naturally.
      if (window.location.pathname === "/") return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign(anchor.href);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}

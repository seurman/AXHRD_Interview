"use client";

import { useEffect } from "react";

/**
 * Temporarily disable the PWA service worker.
 * Older workers intercepted `/` and broke App Router soft navigation
 * (error.tsx: "페이지를 불러오지 못했습니다").
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return null;
}

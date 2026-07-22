"use client";

import { useEffect } from "react";

/**
 * Unregister legacy service workers that intercepted `/` and broke
 * App Router navigation (error.tsx: "페이지를 불러오지 못했습니다").
 * Re-enable a safe SW later only after home/RSC are excluded.
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

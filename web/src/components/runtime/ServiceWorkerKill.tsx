"use client";

import { useEffect } from "react";

/**
 * Unregister every service worker and drop Cache Storage.
 * Production v4 SW intercepted `/` and broke soft navigation.
 * Do not re-register a worker from the client.
 */
export async function killServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

export function ServiceWorkerKill() {
  useEffect(() => {
    void killServiceWorkers().catch(() => {
      /* ignore */
    });
  }, []);

  return null;
}

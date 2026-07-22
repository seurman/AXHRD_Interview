"use client";

import { ServiceWorkerKill } from "@/components/runtime/ServiceWorkerKill";
import { HardNavGuard } from "@/components/runtime/HardNavGuard";

/**
 * Client runtime guards formerly used to register a PWA worker.
 * Now only tears down legacy workers and hard-navigates `/`.
 */
export function PwaRegister() {
  return (
    <>
      <ServiceWorkerKill />
      <HardNavGuard />
    </>
  );
}

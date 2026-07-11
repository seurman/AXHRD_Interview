import type { NavPayload } from "@/lib/nav/client-types";

/** @deprecated headerLinks 제거 — 기관 진단은 org 워크스페이스에서만 */
export function deriveHeaderLinks(_nav: NavPayload | null): { href: string; label: string }[] {
  return [];
}

export function deriveAdminModeEnabled(nav: NavPayload | null): boolean {
  if (!nav?.loggedIn) return false;
  if (nav.adminModeEnabled) return true;
  return nav.adminSections.some((s) => s.links.length > 0);
}

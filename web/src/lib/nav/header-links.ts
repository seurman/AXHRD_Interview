import type { NavPayload } from "@/lib/nav/client-types";

/** API·서버 빌드와 무관하게 헤더 직접 링크 보강 (배포 캐시·nav 오류 대비) */
export function deriveHeaderLinks(nav: NavPayload | null): { href: string; label: string }[] {
  if (!nav?.loggedIn) return [];

  if (nav.headerLinks.length > 0) return nav.headerLinks;

  const links: { href: string; label: string }[] = [];

  const showOrgDiagnosis =
    !!nav.organizationId &&
    (nav.saasLinks?.links.some((l) => l.labelKey === "diagnosticDashboard") ?? false);

  if (showOrgDiagnosis) {
    links.push({ href: "/org/diagnosis", label: "조직진단" });
  }

  return links;
}

export function deriveAdminModeEnabled(nav: NavPayload | null): boolean {
  if (!nav?.loggedIn) return false;
  if (nav.adminModeEnabled) return true;
  return nav.adminSections.some((s) => s.links.length > 0);
}

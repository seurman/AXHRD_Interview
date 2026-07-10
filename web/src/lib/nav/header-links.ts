import type { NavPayload } from "@/lib/nav/client-types";

/** API·서버 빌드와 무관하게 헤더 직접 링크 보강 (배포 캐시·nav 오류 대비) */
export function deriveHeaderLinks(nav: NavPayload | null): { href: string; label: string }[] {
  if (!nav?.loggedIn) return [];

  if (nav.headerLinks.length > 0) return nav.headerLinks;

  const links: { href: string; label: string }[] = [];

  if (nav.isSuperAdmin) {
    if (nav.organizationId) {
      links.push({ href: "/org/diagnosis", label: "조직진단" });
    }
    links.push({ href: "/admin/diagnostic", label: "진단 CMS" });
    return links;
  }

  const adminHrefs = new Set(nav.adminSections.flatMap((s) => s.links.map((l) => l.href)));

  const showCms =
    adminHrefs.has("/admin/diagnostic") || adminHrefs.has("/admin/organizations");
  const showOrgDiagnosis =
    !!nav.organizationId &&
    (nav.saasLinks?.links.some((l) => l.labelKey === "diagnosticDashboard") ||
      adminHrefs.has("/admin/organizations"));

  if (showOrgDiagnosis) {
    links.push({ href: "/org/diagnosis", label: "조직진단" });
  }
  if (showCms) {
    links.push({ href: "/admin/diagnostic", label: "진단 CMS" });
  }

  return links;
}

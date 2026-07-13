import type { OrgEntitlementSnapshot } from "@/lib/org/entitlements";
import type { CapabilityId } from "@/lib/platform/capabilities";
import type { SaasNavConfig } from "@/lib/platform/nav-registry";

/** 기관 워크스페이스 메뉴 — capability + SKU(entitlement) 둘 다 만족할 때만 노출 */
export function buildSaasNavConfig(
  caps: Set<CapabilityId>,
  entitlements: OrgEntitlementSnapshot,
): SaasNavConfig | null {
  const links: SaasNavConfig["links"] = [];
  const settingsLinks: SaasNavConfig["settingsLinks"] = [];

  if (caps.has("tenant.cohort") && entitlements.interview) {
    links.push({ href: "/org/dashboard", labelKey: "cohortDashboard" });
  }
  if (caps.has("tenant.interview_kit") && entitlements.competency) {
    links.push({ href: "/org/candidates", labelKey: "candidateResults" });
  }
  if (caps.has("tenant.diagnostic") && entitlements.diagnostic) {
    links.push({ href: "/org/diagnosis", labelKey: "diagnosticDashboard" });
  }

  if (caps.has("tenant.settings") || caps.has("tenant.interview_kit")) {
    if (entitlements.competency || entitlements.interview) {
      settingsLinks.push({ href: "/org/settings", labelKey: "settingsHub" });
    }
  }

  if (links.length === 0 && settingsLinks.length === 0) return null;

  return {
    titleKey: "saas",
    links,
    settingsTitleKey: "settings",
    settingsLinks,
  };
}

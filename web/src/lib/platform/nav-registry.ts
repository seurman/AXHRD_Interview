import type { CapabilityId } from "@/lib/platform/capabilities";
import { CAPABILITY_REGISTRY } from "@/lib/platform/capabilities";
import { hasCapability, resolveUserCapabilities, type AccessContext } from "@/lib/platform/access";
import { isSuperAdminUser, type RoleUser } from "@/lib/auth/roles";

export type NavLabelKey =
  | "content"
  | "demo"
  | "users"
  | "audit"
  | "orgApprove"
  | "orgBenchmark"
  | "subscriptions"
  | "permissions";

export type AdminNavItem = {
  href: string;
  labelKey: NavLabelKey;
  capability: CapabilityId;
};

const PLATFORM_NAV_ORDER: AdminNavItem[] = [
  { href: "/admin/permissions", labelKey: "permissions", capability: "platform.permissions" },
  { href: "/admin/users", labelKey: "users", capability: "platform.users" },
  { href: "/admin/organizations", labelKey: "orgApprove", capability: "platform.organizations" },
  { href: "/admin/content", labelKey: "content", capability: "platform.content" },
  { href: "/admin/demo", labelKey: "demo", capability: "platform.demo" },
  { href: "/admin/subscriptions", labelKey: "subscriptions", capability: "platform.subscriptions" },
  { href: "/admin/audit", labelKey: "audit", capability: "platform.audit" },
  { href: "/admin/organizations/benchmark", labelKey: "orgBenchmark", capability: "platform.benchmark" },
];

const PRODUCT_HREFS: { href: string; capability: CapabilityId }[] = [
  { href: "/dashboard", capability: "product.dashboard" },
  { href: "/discover", capability: "product.discover" },
  { href: "/interview/setup", capability: "product.interview" },
  { href: "/practice/swipe", capability: "product.practice" },
  { href: "/profile", capability: "product.profile" },
];

export type SaasNavConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export type NavigationConfig = {
  mainHrefs: string[];
  saasLinks: SaasNavConfig | null;
  adminLinks: { href: string; labelKey: NavLabelKey }[];
  platformConsoleHrefs: { href: string; label: string; capability: CapabilityId }[];
  capabilities: CapabilityId[];
};

export async function buildNavigationForUser(user: RoleUser): Promise<NavigationConfig> {
  let tenantPersonalizationEnabled = false;
  if (user.organizationId && user.orgRole === "ADMIN") {
    const { prisma } = await import("@/lib/prisma");
    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { saasPersonalizationEnabled: true },
    });
    tenantPersonalizationEnabled = org?.saasPersonalizationEnabled ?? false;
  }

  const context: AccessContext = { tenantPersonalizationEnabled };
  const caps = resolveUserCapabilities(user, context);

  const mainHrefs = PRODUCT_HREFS.filter((p) => caps.has(p.capability)).map((p) => p.href);

  let saasLinks: SaasNavConfig | null = null;
  const hasTenantNav =
    caps.has("tenant.cohort") ||
    caps.has("tenant.settings") ||
    caps.has("tenant.interview_kit") ||
    isSuperAdminUser(user);

  if (hasTenantNav) {
    const links: SaasNavConfig["links"] = [];
    const settingsLinks: SaasNavConfig["settingsLinks"] = [];

    if (caps.has("tenant.cohort")) {
      links.push({
        href: isSuperAdminUser(user) ? "/admin/organizations" : "/org/dashboard",
        labelKey: "cohortDashboard",
      });
    }

    if (isSuperAdminUser(user)) {
      settingsLinks.push({ href: "/admin/organizations", labelKey: "settingsHub" });
    } else if (caps.has("tenant.settings")) {
      settingsLinks.push({ href: "/org/settings", labelKey: "settingsHub" });
    }
    if (!isSuperAdminUser(user) && caps.has("tenant.interview_kit")) {
      settingsLinks.push({ href: "/org/settings/interview-kit", labelKey: "interviewKit" });
    }

    if (links.length > 0 || settingsLinks.length > 0) {
      saasLinks = {
        titleKey: "saas",
        links,
        settingsTitleKey: "settings",
        settingsLinks,
      };
    }
  }

  const adminLinks = PLATFORM_NAV_ORDER.filter((item) => caps.has(item.capability)).map(
    ({ href, labelKey }) => ({ href, labelKey })
  );

  // 수퍼어드민: 플랫폼 콘솔 사이드바용 전체 모듈
  const platformConsoleHrefs = PLATFORM_NAV_ORDER.filter((item) => caps.has(item.capability)).map(
    (item) => ({
      href: item.href,
      label: CAPABILITY_REGISTRY[item.capability].labelKo,
      capability: item.capability,
    })
  );

  return {
    mainHrefs,
    saasLinks,
    adminLinks,
    platformConsoleHrefs,
    capabilities: [...caps],
  };
}

export function canAccessAdminModule(
  user: RoleUser,
  capability: CapabilityId,
  context?: AccessContext
): boolean {
  return hasCapability(user, capability, context);
}

/** 기관 담당자 여부 (레거시 호환) */
export function isTenantStaffUser(user: RoleUser): boolean {
  return !!user.organizationId && (user.orgRole === "STAFF" || user.orgRole === "ADMIN");
}

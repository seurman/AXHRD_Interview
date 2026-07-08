import type { CapabilityId } from "@/lib/platform/capabilities";
import { CAPABILITY_REGISTRY } from "@/lib/platform/capabilities";
import { hasCapability, resolveUserCapabilities, type AccessContext } from "@/lib/platform/access";
import { type RoleUser } from "@/lib/auth/roles";

export type NavLabelKey =
  | "content"
  | "demo"
  | "users"
  | "audit"
  | "orgApprove"
  | "orgBenchmark"
  | "subscriptions"
  | "permissions";

export type PrepareLabelKey = "interview" | "discover" | "cards";

export type AdminSectionKey = "content" | "tenants" | "security" | "billing";

export type AdminNavItem = {
  href: string;
  labelKey: NavLabelKey;
  capability: CapabilityId;
  section: AdminSectionKey;
};

const PLATFORM_NAV_ORDER: AdminNavItem[] = [
  { href: "/admin/content", labelKey: "content", capability: "platform.content", section: "content" },
  { href: "/admin/demo", labelKey: "demo", capability: "platform.demo", section: "content" },
  {
    href: "/admin/organizations",
    labelKey: "orgApprove",
    capability: "platform.organizations",
    section: "tenants",
  },
  {
    href: "/admin/organizations/benchmark",
    labelKey: "orgBenchmark",
    capability: "platform.benchmark",
    section: "tenants",
  },
  { href: "/admin/users", labelKey: "users", capability: "platform.users", section: "security" },
  {
    href: "/admin/permissions",
    labelKey: "permissions",
    capability: "platform.permissions",
    section: "security",
  },
  { href: "/admin/audit", labelKey: "audit", capability: "platform.audit", section: "security" },
  {
    href: "/admin/subscriptions",
    labelKey: "subscriptions",
    capability: "platform.subscriptions",
    section: "billing",
  },
];

const ADMIN_SECTION_ORDER: AdminSectionKey[] = ["content", "tenants", "security", "billing"];

const PREPARE_HREFS: { href: string; labelKey: PrepareLabelKey; capability: CapabilityId }[] = [
  { href: "/interview/setup", labelKey: "interview", capability: "product.interview" },
  { href: "/discover", labelKey: "discover", capability: "product.discover" },
  { href: "/practice/swipe", labelKey: "cards", capability: "product.practice" },
];

export type SaasNavConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export type AdminNavSection = {
  sectionKey: AdminSectionKey;
  links: { href: string; labelKey: NavLabelKey }[];
};

export type NavigationConfig = {
  /** @deprecated flat list — prefer dashboardHref / prepareLinks / profileHref */
  mainHrefs: string[];
  dashboardHref: string | null;
  prepareLinks: { href: string; labelKey: PrepareLabelKey }[];
  profileHref: string | null;
  saasLinks: SaasNavConfig | null;
  adminLinks: { href: string; labelKey: NavLabelKey }[];
  adminSections: AdminNavSection[];
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

  const dashboardHref = caps.has("product.dashboard") ? "/dashboard" : null;
  const prepareLinks = PREPARE_HREFS.filter((p) => caps.has(p.capability)).map(({ href, labelKey }) => ({
    href,
    labelKey,
  }));
  const profileHref = caps.has("product.profile") ? "/profile" : null;

  const mainHrefs = [
    ...(dashboardHref ? [dashboardHref] : []),
    ...prepareLinks.map((l) => l.href),
    ...(profileHref ? [profileHref] : []),
  ];

  let saasLinks: SaasNavConfig | null = null;
  const hasOrgMembership = !!user.organizationId;
  const hasTenantNav =
    hasOrgMembership &&
    (caps.has("tenant.cohort") ||
      caps.has("tenant.settings") ||
      caps.has("tenant.interview_kit"));

  if (hasTenantNav) {
    const links: SaasNavConfig["links"] = [];
    const settingsLinks: SaasNavConfig["settingsLinks"] = [];

    if (caps.has("tenant.cohort")) {
      links.push({
        href: "/org/dashboard",
        labelKey: "cohortDashboard",
      });
    }

    if (caps.has("tenant.settings")) {
      settingsLinks.push({ href: "/org/settings", labelKey: "settingsHub" });
    }
    if (caps.has("tenant.interview_kit")) {
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

  const visibleAdmin = PLATFORM_NAV_ORDER.filter((item) => caps.has(item.capability));
  const adminLinks = visibleAdmin.map(({ href, labelKey }) => ({ href, labelKey }));

  const adminSections: AdminNavSection[] = ADMIN_SECTION_ORDER.map((sectionKey) => ({
    sectionKey,
    links: visibleAdmin
      .filter((item) => item.section === sectionKey)
      .map(({ href, labelKey }) => ({ href, labelKey })),
  })).filter((s) => s.links.length > 0);

  const platformConsoleHrefs = visibleAdmin.map((item) => ({
    href: item.href,
    label: CAPABILITY_REGISTRY[item.capability].labelKo,
    capability: item.capability,
  }));

  return {
    mainHrefs,
    dashboardHref,
    prepareLinks,
    profileHref,
    saasLinks,
    adminLinks,
    adminSections,
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

import type { CapabilityId } from "@/lib/platform/capabilities";
import { dictionary as koDictionary } from "@/lib/i18n/dictionaries/ko";
import { hasCapability, resolveUserCapabilities, type AccessContext } from "@/lib/platform/access";
import { type RoleUser, isSuperAdminUser } from "@/lib/auth/roles";

export type NavLabelKey =
  | "content"
  | "repository"
  | "demo"
  | "users"
  | "audit"
  | "sessions"
  | "orgApprove"
  | "orgBenchmark"
  | "subscriptions"
  | "permissions"
  | "diagnostic";

export type PrepareLabelKey = "interview" | "discover" | "cards" | "resumeReview" | "trialInterview";

export type AdminSectionKey = "tenants" | "product" | "operations" | "settings";

export type AdminNavItem = {
  href: string;
  labelKey: NavLabelKey;
  capability: CapabilityId;
  section: AdminSectionKey;
};

export const PLATFORM_NAV_ORDER: AdminNavItem[] = [
  {
    href: "/admin/organizations",
    labelKey: "orgApprove",
    capability: "platform.organizations",
    section: "tenants",
  },
  { href: "/admin/content", labelKey: "content", capability: "platform.content", section: "product" },
  {
    href: "/admin/repository",
    labelKey: "repository",
    capability: "platform.content",
    section: "product",
  },
  {
    href: "/admin/diagnostic",
    labelKey: "diagnostic",
    capability: "platform.diagnostic",
    section: "product",
  },
  { href: "/admin/demo", labelKey: "demo", capability: "platform.demo", section: "product" },
  { href: "/admin/users", labelKey: "users", capability: "platform.users", section: "operations" },
  {
    href: "/admin/sessions",
    labelKey: "sessions",
    capability: "platform.sessions",
    section: "operations",
  },
  { href: "/admin/audit", labelKey: "audit", capability: "platform.audit", section: "operations" },
  {
    href: "/admin/subscriptions",
    labelKey: "subscriptions",
    capability: "platform.subscriptions",
    section: "settings",
  },
  {
    href: "/admin/permissions",
    labelKey: "permissions",
    capability: "platform.permissions",
    section: "settings",
  },
];

const ADMIN_SECTION_ORDER: AdminSectionKey[] = ["tenants", "product", "operations", "settings"];

async function loadOrgAdminFlags(organizationId: string): Promise<{
  tenantPersonalizationEnabled: boolean;
  diagnosticEnabled: boolean;
  interviewEnabled: boolean;
}> {
  const { prisma } = await import("@/lib/prisma");
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        saasPersonalizationEnabled: true,
        diagnosticEnabled: true,
        interviewEnabled: true,
      },
    });
    return {
      tenantPersonalizationEnabled: org?.saasPersonalizationEnabled ?? false,
      diagnosticEnabled: org?.diagnosticEnabled ?? false,
      interviewEnabled: org?.interviewEnabled ?? true,
    };
  } catch {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { saasPersonalizationEnabled: true, interviewEnabled: true },
    });
    return {
      tenantPersonalizationEnabled: org?.saasPersonalizationEnabled ?? false,
      diagnosticEnabled: false,
      interviewEnabled: org?.interviewEnabled ?? true,
    };
  }
}

const PREPARE_HREFS: { href: string; labelKey: PrepareLabelKey; capability: CapabilityId }[] = [
  { href: "/demo", labelKey: "trialInterview", capability: "product.demo_trial" },
  { href: "/interview/setup", labelKey: "interview", capability: "product.interview" },
  { href: "/resume-review", labelKey: "resumeReview", capability: "product.resume_review" },
  { href: "/discover", labelKey: "discover", capability: "product.discover" },
  { href: "/practice/swipe", labelKey: "cards", capability: "product.practice" },
];

export type SaasNavConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" | "diagnosticDashboard" }[];
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
  /** 수퍼어드민 전용 — 헤더에 직접 노출되는 운영 링크 */
  headerLinks: { href: string; label: string }[];
  isSuperAdmin: boolean;
  adminLinks: { href: string; labelKey: NavLabelKey }[];
  adminSections: AdminNavSection[];
  platformConsoleHrefs: { href: string; label: string; capability: CapabilityId }[];
  capabilities: CapabilityId[];
};

export async function buildNavigationForUser(
  user: RoleUser & { id?: string },
): Promise<NavigationConfig> {
  const superAdmin = isSuperAdminUser(user);
  let tenantPersonalizationEnabled = superAdmin;
  let diagnosticEnabled = superAdmin;
  let interviewEnabled = superAdmin;
  let billingTier: import("@prisma/client").PlanTier | undefined;
  if (user.id) {
    const { getBillingContext } = await import("@/lib/billing/subscription");
    const billing = await getBillingContext(user.id);
    billingTier = billing.planTier;
  }
  if (user.organizationId && user.orgRole === "ADMIN") {
    const flags = await loadOrgAdminFlags(user.organizationId);
    tenantPersonalizationEnabled = superAdmin || flags.tenantPersonalizationEnabled;
    diagnosticEnabled = superAdmin || flags.diagnosticEnabled;
    interviewEnabled = superAdmin || flags.interviewEnabled;
  }

  const context: AccessContext = {
    interviewEnabled,
    tenantPersonalizationEnabled,
    diagnosticEnabled,
    billingTier,
  };
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

  if (superAdmin && hasOrgMembership) {
    saasLinks = {
      titleKey: "saas",
      links: [
        { href: "/org/dashboard", labelKey: "cohortDashboard" },
        { href: "/org/diagnosis", labelKey: "diagnosticDashboard" },
      ],
      settingsTitleKey: "settings",
      settingsLinks: [
        { href: "/org/settings", labelKey: "settingsHub" },
        { href: "/org/settings/interview-kit", labelKey: "interviewKit" },
      ],
    };
  } else {
    const hasTenantNav =
      hasOrgMembership &&
      (caps.has("tenant.cohort") ||
        caps.has("tenant.settings") ||
        caps.has("tenant.interview_kit") ||
        caps.has("tenant.diagnostic"));

    if (hasTenantNav) {
      const links: SaasNavConfig["links"] = [];
      const settingsLinks: SaasNavConfig["settingsLinks"] = [];

      if (caps.has("tenant.cohort")) {
        links.push({
          href: "/org/dashboard",
          labelKey: "cohortDashboard",
        });
      }
      if (caps.has("tenant.diagnostic")) {
        links.push({
          href: "/org/diagnosis",
          labelKey: "diagnosticDashboard",
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
  }

  const headerLinks: { href: string; label: string }[] = [];
  if (hasOrgMembership && caps.has("tenant.diagnostic")) {
    headerLinks.push({ href: "/org/diagnosis", label: "조직진단" });
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
    label: koDictionary.common.admin[item.labelKey],
    capability: item.capability,
  }));

  return {
    mainHrefs,
    dashboardHref,
    prepareLinks,
    profileHref,
    saasLinks,
    headerLinks,
    isSuperAdmin: superAdmin,
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

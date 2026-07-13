import type { CapabilityId } from "@/lib/platform/capabilities";
import { dictionary as koDictionary } from "@/lib/i18n/dictionaries/ko";
import { hasCapability, resolveUserCapabilities, type AccessContext } from "@/lib/platform/access";
import { type RoleUser, isSuperAdminUser } from "@/lib/auth/roles";
import { readOrgEntitlements } from "@/lib/org/entitlements";
import { buildSaasNavConfig } from "@/lib/org/saas-nav";

export type NavLabelKey =
  | "content"
  | "repository"
  | "demo"
  | "users"
  | "audit"
  | "sessions"
  | "dataStorage"
  | "orgApprove"
  | "orgBenchmark"
  | "subscriptions"
  | "permissions"
  | "diagnostic";

export type PrepareLabelKey = "interview" | "discover" | "cards" | "resumeReview" | "trialInterview";

export type GuestProductLabelKey =
  | "allProducts"
  | "trialInterview"
  | "discover"
  | "resume"
  | "interview"
  | "practice"
  | "growth"
  | "orgDiagnosis"
  | "forOrganizations";

export type NavLinkItem = { href: string; labelKey: PrepareLabelKey };

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
  {
    href: "/admin/data-storage",
    labelKey: "dataStorage",
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

/** 여정 순서: 탐색 → 준비 → 실전 */
const GROWTH_HREFS: { href: string; labelKey: PrepareLabelKey; capability: CapabilityId }[] = [
  { href: "/discover", labelKey: "discover", capability: "product.discover" },
  { href: "/resume-review", labelKey: "resumeReview", capability: "product.resume_review" },
  { href: "/interview/setup", labelKey: "interview", capability: "product.interview" },
];

const PRACTICE_HREFS: { href: string; labelKey: PrepareLabelKey; capability: CapabilityId }[] = [
  { href: "/demo", labelKey: "trialInterview", capability: "product.demo_trial" },
  { href: "/practice/swipe", labelKey: "cards", capability: "product.practice" },
];

/** 게스트 제품 메뉴 — 실제 앱 진입점만 (소개 /products 페이지는 숨김) */
export const GUEST_PRODUCT_HREFS: { href: string; labelKey: GuestProductLabelKey }[] = [
  { href: "/demo", labelKey: "trialInterview" },
  { href: "/discover", labelKey: "discover" },
  { href: "/auth/register?next=/interview/setup", labelKey: "interview" },
  { href: "/diagnosis", labelKey: "orgDiagnosis" },
  { href: "/org/setup", labelKey: "forOrganizations" },
];

function filterNavLinks<T extends { capability: CapabilityId; href: string; labelKey: PrepareLabelKey }>(
  items: T[],
  caps: Set<CapabilityId>,
): NavLinkItem[] {
  return items.filter((p) => caps.has(p.capability)).map(({ href, labelKey }) => ({ href, labelKey }));
}

export type SaasNavConfig = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" | "diagnosticDashboard" | "candidateResults" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export type AdminNavSection = {
  sectionKey: AdminSectionKey;
  links: { href: string; labelKey: NavLabelKey }[];
};

export type NavigationConfig = {
  /** @deprecated flat list — prefer workspace nav fields */
  mainHrefs: string[];
  dashboardHref: string | null;
  /** @deprecated use growthLinks + practiceLinks */
  prepareLinks: NavLinkItem[];
  growthLinks: NavLinkItem[];
  practiceLinks: NavLinkItem[];
  activityHref: string | null;
  orgWorkspaceAvailable: boolean;
  profileHref: string | null;
  saasLinks: SaasNavConfig | null;
  /** @deprecated — 조직진단은 기관 워크스페이스에서만 */
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
  const growthLinks = filterNavLinks(GROWTH_HREFS, caps);
  const practiceLinks = filterNavLinks(PRACTICE_HREFS, caps);
  const prepareLinks = [...growthLinks, ...practiceLinks];
  const profileHref = caps.has("product.profile") ? "/profile" : null;
  const activityHref = null;

  const mainHrefs = [
    ...(dashboardHref ? [dashboardHref] : []),
    ...prepareLinks.map((l) => l.href),
    ...(profileHref ? [profileHref] : []),
  ];

  let saasLinks: SaasNavConfig | null = null;
  const hasOrgMembership = !!user.organizationId;

  if (hasOrgMembership && user.organizationId) {
    const { prisma } = await import("@/lib/prisma");
    const orgRecord = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        interviewEnabled: true,
        saasPersonalizationEnabled: true,
        diagnosticEnabled: true,
      },
    });
    const entitlements = orgRecord
      ? readOrgEntitlements(orgRecord)
      : { interview: false, competency: false, diagnostic: false };

    const hasTenantNav =
      superAdmin ||
      caps.has("tenant.cohort") ||
      caps.has("tenant.settings") ||
      caps.has("tenant.interview_kit") ||
      caps.has("tenant.diagnostic");

    if (hasTenantNav) {
      saasLinks = buildSaasNavConfig(caps, entitlements);
    }
  }

  const orgWorkspaceAvailable = saasLinks !== null;

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
    growthLinks,
    practiceLinks,
    activityHref,
    orgWorkspaceAvailable,
    profileHref,
    saasLinks,
    headerLinks: [],
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

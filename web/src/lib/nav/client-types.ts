import type { AdminNavSection, NavLinkItem } from "@/lib/platform/nav-registry";

export type SaasNavPayload = {
  titleKey: "saas";
  links: {
    href: string;
    labelKey: "cohortDashboard" | "diagnosticDashboard" | "candidateResults" | "members" | "peopleDashboard";
  }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export type NavPayload = {
  loggedIn: boolean;
  userName: string | null;
  orgRole: string | null;
  organizationId: string | null;
  isSuperAdmin: boolean;
  /** @deprecated — 빈 배열 유지 */
  headerLinks: { href: string; label: string }[];
  adminModeEnabled: boolean;
  trialOnly: boolean;
  canPresentDemo: boolean;
  dashboardHref: string | null;
  /** @deprecated use growthLinks + practiceLinks */
  prepareLinks: NavLinkItem[];
  growthLinks: NavLinkItem[];
  practiceLinks: NavLinkItem[];
  activityHref: string | null;
  orgWorkspaceAvailable: boolean;
  profileHref: string | null;
  saasLinks: SaasNavPayload | null;
  adminSections: AdminNavSection[];
};

export const GUEST_NAV: NavPayload = {
  loggedIn: false,
  userName: null,
  orgRole: null,
  organizationId: null,
  isSuperAdmin: false,
  headerLinks: [],
  adminModeEnabled: false,
  trialOnly: false,
  canPresentDemo: false,
  dashboardHref: null,
  prepareLinks: [],
  growthLinks: [],
  practiceLinks: [],
  activityHref: null,
  orgWorkspaceAvailable: false,
  profileHref: null,
  saasLinks: null,
  adminSections: [],
};

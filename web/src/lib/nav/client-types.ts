import type { AdminNavSection, PrepareLabelKey } from "@/lib/platform/nav-registry";

export type SaasNavPayload = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export type NavPayload = {
  loggedIn: boolean;
  userName: string | null;
  orgRole: string | null;
  organizationId: string | null;
  dashboardHref: string | null;
  prepareLinks: { href: string; labelKey: PrepareLabelKey }[];
  profileHref: string | null;
  saasLinks: SaasNavPayload | null;
  adminSections: AdminNavSection[];
};

export const GUEST_NAV: NavPayload = {
  loggedIn: false,
  userName: null,
  orgRole: null,
  organizationId: null,
  dashboardHref: null,
  prepareLinks: [],
  profileHref: null,
  saasLinks: null,
  adminSections: [],
};

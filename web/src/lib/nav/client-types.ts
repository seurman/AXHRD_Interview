import type { AdminNavSection, PrepareLabelKey } from "@/lib/platform/nav-registry";

export type SaasNavPayload = {
  titleKey: "saas";
  links: { href: string; labelKey: "cohortDashboard" | "diagnosticDashboard" }[];
  settingsTitleKey: "settings";
  settingsLinks: { href: string; labelKey: "settingsHub" | "interviewKit" }[];
};

export type NavPayload = {
  loggedIn: boolean;
  userName: string | null;
  orgRole: string | null;
  organizationId: string | null;
  isSuperAdmin: boolean;
  /** 수퍼어드민 — 헤더 직접 링크 (조직진단·진단 CMS) */
  headerLinks: { href: string; label: string }[];
  /** FREE 개인 사용자 — 5분 면접 체험만 허용 */
  trialOnly: boolean;
  canPresentDemo: boolean;
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
  isSuperAdmin: false,
  headerLinks: [],
  trialOnly: false,
  canPresentDemo: false,
  dashboardHref: null,
  prepareLinks: [],
  profileHref: null,
  saasLinks: null,
  adminSections: [],
};

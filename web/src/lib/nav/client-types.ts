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
  /** 기관 조직진단 — 헤더 직접 링크 (플랫폼 CMS는 관리자 모드로 분리) */
  headerLinks: { href: string; label: string }[];
  /** Platform Console (/admin) 접근 가능 */
  adminModeEnabled: boolean;
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
  adminModeEnabled: false,
  trialOnly: false,
  canPresentDemo: false,
  dashboardHref: null,
  prepareLinks: [],
  profileHref: null,
  saasLinks: null,
  adminSections: [],
};

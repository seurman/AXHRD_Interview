import type { AdminSectionKey } from "@/lib/platform/nav-registry";

export type PlatformWorkspaceKey = "overview" | AdminSectionKey;

export type PlatformWorkspace = {
  key: PlatformWorkspaceKey;
  labelKey: PlatformWorkspaceKey;
  defaultHref: string;
  /** pathname이 이 prefix 중 하나로 시작하면 해당 워크스페이스 */
  matchPrefixes: string[];
};

export const PLATFORM_WORKSPACES: PlatformWorkspace[] = [
  {
    key: "overview",
    labelKey: "overview",
    defaultHref: "/admin",
    matchPrefixes: ["/admin"],
  },
  {
    key: "tenants",
    labelKey: "tenants",
    defaultHref: "/admin/organizations",
    matchPrefixes: ["/admin/organizations"],
  },
  {
    key: "product",
    labelKey: "product",
    defaultHref: "/admin/content",
    matchPrefixes: [
      "/admin/content",
      "/admin/repository",
      "/admin/diagnostic",
      "/admin/demo",
      "/admin/irt-recalibration",
    ],
  },
  {
    key: "operations",
    labelKey: "operations",
    defaultHref: "/admin/users",
    matchPrefixes: ["/admin/users", "/admin/sessions", "/admin/data-storage", "/admin/audit"],
  },
  {
    key: "settings",
    labelKey: "settings",
    defaultHref: "/admin/subscriptions",
    matchPrefixes: ["/admin/subscriptions", "/admin/permissions"],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "개요",
  "/admin/organizations": "기관",
  "/admin/organizations/benchmark": "기관 비교",
  "/admin/content": "IRT 문항",
  "/admin/content/resume-review": "자소서 첨삭 기준",
  "/admin/irt-recalibration": "IRT 재보정",
  "/admin/repository": "역량·루브릭",
  "/admin/diagnostic": "조직진단 CMS",
  "/admin/demo": "데모 워크스페이스",
  "/admin/users": "사용자",
  "/admin/sessions": "면접 세션",
  "/admin/data-storage": "데이터 저장 검증",
  "/admin/audit": "감사 로그",
  "/admin/subscriptions": "구독·결제",
  "/admin/permissions": "권한 매트릭스",
};

export function resolvePlatformWorkspace(pathname: string): PlatformWorkspaceKey {
  if (pathname === "/admin") return "overview";

  for (const ws of PLATFORM_WORKSPACES) {
    if (ws.key === "overview") continue;
    if (ws.matchPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return ws.key;
    }
  }

  return "overview";
}

export function resolvePlatformPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  if (pathname.startsWith("/admin/organizations/") && pathname !== "/admin/organizations/benchmark") {
    if (/\/waves\/[^/]+\/report\/?$/.test(pathname)) return "진단 리포트";
    if (/\/waves\/[^/]+\/?$/.test(pathname)) return "웨이브 상세";
    if (/\/waves\/?$/.test(pathname)) return "조직진단 웨이브";
    if (pathname.includes("/cohort")) return "참여 현황";
    if (pathname.includes("/interview-kit")) return "인터뷰 킷";
    return "기관 허브";
  }
  if (pathname.startsWith("/admin/diagnostic/waves/")) {
    return pathname.endsWith("/report") ? "진단 리포트" : "웨이브 상세";
  }
  if (pathname.startsWith("/admin/sessions/")) return "세션 상세";
  if (pathname.startsWith("/admin/demo/")) return "데모 워크스페이스";

  return "AX Configure";
}

export function workspaceForSection(sectionKey: AdminSectionKey): PlatformWorkspaceKey {
  return sectionKey;
}

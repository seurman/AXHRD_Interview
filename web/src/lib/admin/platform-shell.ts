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
    ],
  },
  {
    key: "operations",
    labelKey: "operations",
    defaultHref: "/admin/users",
    matchPrefixes: ["/admin/users", "/admin/sessions", "/admin/audit"],
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
  "/admin/repository": "역량·루브릭",
  "/admin/diagnostic": "진단 캠페인",
  "/admin/demo": "데모 워크스페이스",
  "/admin/users": "사용자",
  "/admin/sessions": "면접 세션",
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
    return "기관 허브";
  }
  if (pathname.startsWith("/admin/diagnostic/waves/")) {
    return pathname.endsWith("/report") ? "진단 리포트" : "캠페인 상세";
  }
  if (pathname.startsWith("/admin/sessions/")) return "세션 상세";
  if (pathname.startsWith("/admin/demo/")) return "데모 워크스페이스";

  return "AX Configure";
}

export function workspaceForSection(sectionKey: AdminSectionKey): PlatformWorkspaceKey {
  return sectionKey;
}

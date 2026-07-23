import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { buildNavigationForUser } from "@/lib/platform/nav-registry";
import { canManageDemoWorkspaces } from "@/lib/auth/roles";
import { isPersonalTrialOnlyUser } from "@/lib/auth/personal-access";
import { deriveHeaderLinks, deriveAdminModeEnabled } from "@/lib/nav/header-links";
import type { NavPayload } from "@/lib/nav/client-types";

/** 클라이언트 헤더용 — 로그인 상태·역할별 네비 구성 */
export async function GET() {
  const sessionUser = await getCurrentUser();

  const user =
    sessionUser && hasSuperadminAccess(sessionUser)
      ? { ...sessionUser, platformRole: "SUPERADMIN" as const }
      : sessionUser;

  if (!user) {
    return NextResponse.json({
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
    } satisfies NavPayload);
  }

  const nav = await buildNavigationForUser({
    id: user.id,
    email: user.email,
    platformRole: user.platformRole,
    orgRole: user.orgRole,
    organizationId: user.organizationId,
  }).catch((e) => {
    console.error("[api/nav] buildNavigationForUser", e);
    const superAdmin = user ? hasSuperadminAccess(user) : false;
    return {
      dashboardHref: "/dashboard/jobseeker" as string | null,
      prepareLinks: [] as import("@/lib/platform/nav-registry").NavLinkItem[],
      growthLinks: [] as import("@/lib/platform/nav-registry").NavLinkItem[],
      practiceLinks: [] as import("@/lib/platform/nav-registry").NavLinkItem[],
      activityHref: null,
      orgWorkspaceAvailable: false,
      profileHref: "/profile" as string | null,
      saasLinks: null,
      headerLinks: [] as { href: string; label: string }[],
      isSuperAdmin: superAdmin,
      adminSections: [] as import("@/lib/nav/client-types").NavPayload["adminSections"],
    };
  });

  const body: NavPayload = {
    loggedIn: true,
    userName: user.name,
    orgRole: user.orgRole,
    organizationId: user.organizationId,
    isSuperAdmin: hasSuperadminAccess(user) || (nav.isSuperAdmin ?? false),
    headerLinks: [],
    adminModeEnabled: false,
    trialOnly: isPersonalTrialOnlyUser(user),
    canPresentDemo: canManageDemoWorkspaces({
      email: user.email,
      platformRole: user.platformRole,
    }),
    dashboardHref: nav.dashboardHref,
    prepareLinks: nav.prepareLinks,
    growthLinks: nav.growthLinks,
    practiceLinks: nav.practiceLinks,
    activityHref: nav.activityHref,
    orgWorkspaceAvailable: nav.orgWorkspaceAvailable,
    profileHref: nav.profileHref,
    saasLinks: nav.saasLinks,
    adminSections: nav.adminSections,
  };

  body.headerLinks = deriveHeaderLinks(body);
  body.adminModeEnabled = deriveAdminModeEnabled(body);

  return NextResponse.json(body);
}

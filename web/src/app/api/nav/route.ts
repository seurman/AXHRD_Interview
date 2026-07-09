import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin } from "@/lib/auth/guards";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { buildNavigationForUser } from "@/lib/platform/nav-registry";
import { canManageDemoWorkspaces } from "@/lib/auth/roles";
import {
  isPersonalTrialOnlyUser,
  loadPersonalAccessContext,
} from "@/lib/auth/personal-access";
import type { NavPayload } from "@/lib/nav/client-types";

/** 클라이언트 헤더용 — 로그인 상태·역할별 네비 구성 */
export async function GET() {
  const sessionUser = await getCurrentUser();
  if (sessionUser && isSuperadmin(sessionUser.email)) {
    await syncSuperadminPlatformRole(sessionUser.id, sessionUser.email);
  }

  const user =
    sessionUser && isSuperadmin(sessionUser.email)
      ? { ...sessionUser, platformRole: "SUPERADMIN" as const }
      : sessionUser;

  if (!user) {
    return NextResponse.json({
      loggedIn: false,
      userName: null,
      orgRole: null,
      organizationId: null,
      trialOnly: false,
      canPresentDemo: false,
      dashboardHref: null,
      prepareLinks: [],
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
  });

  const personalContext = await loadPersonalAccessContext(user.id);

  const body: NavPayload = {
    loggedIn: true,
    userName: user.name,
    orgRole: user.orgRole,
    organizationId: user.organizationId,
    trialOnly: isPersonalTrialOnlyUser(user, personalContext),
    canPresentDemo: canManageDemoWorkspaces({
      email: user.email,
      platformRole: user.platformRole,
    }),
    dashboardHref: nav.dashboardHref,
    prepareLinks: nav.prepareLinks,
    profileHref: nav.profileHref,
    saasLinks: nav.saasLinks,
    adminSections: nav.adminSections,
  };

  return NextResponse.json(body);
}

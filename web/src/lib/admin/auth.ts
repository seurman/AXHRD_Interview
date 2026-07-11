import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin } from "@/lib/auth/guards";
import type { PlatformRole } from "@prisma/client";
import {
  canGrantPlatformRoles,
  canManageDemoWorkspaces,
  canMutatePlatformSettings,
  canViewContentConsole,
  canViewDiagnosticConsole,
  canViewPlatformOrganizations,
  canViewPlatformSessions,
} from "@/lib/auth/platform-ops";
import { canAccessProductionContentBank } from "@/lib/auth/roles";

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function hasSuperadminAccess(user: { email: string; platformRole: PlatformRole }) {
  return isSuperadmin(user.email) || user.platformRole === "SUPERADMIN";
}

export function isProductionContentAdmin(user: { email: string; platformRole: PlatformRole }) {
  return canAccessProductionContentBank(user);
}

export function isDemoManager(user: { email: string; platformRole: PlatformRole }) {
  return canManageDemoWorkspaces(user);
}

/** @deprecated */
export function isPlatformAdmin(user: { email: string; platformRole: PlatformRole }) {
  return isProductionContentAdmin(user) || isDemoManager(user);
}

/** @deprecated */
export function canManageContent(user: { email: string; platformRole: PlatformRole }) {
  return isPlatformAdmin(user);
}

export function canHardDelete(user: { email: string; platformRole: PlatformRole }) {
  return hasSuperadminAccess(user);
}

export { canGrantPlatformRoles };

export async function requireProductionContentApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!isProductionContentAdmin(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export async function requireContentConsoleReadApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canViewContentConsole(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export async function requireDemoManagerApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!isDemoManager(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export async function requireOrganizationsReadApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canViewPlatformOrganizations(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export async function requireOrganizationsWriteApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canMutatePlatformSettings(user)) {
    return NextResponse.json({ error: "플랫폼 설정 변경 권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export async function requireDiagnosticConsoleReadApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canViewDiagnosticConsole(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

/** @deprecated requireProductionContentApi */
export async function requirePlatformAdminApi(): Promise<AdminUser | NextResponse> {
  return requireProductionContentApi();
}

export async function requireSuperadminApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export async function requireSessionsReadApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canViewPlatformSessions(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
}

export function isAdminResponse(result: AdminUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

export function auditActor(user: AdminUser) {
  return { id: user.id, email: user.email, platformRole: user.platformRole };
}

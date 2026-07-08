import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin } from "@/lib/auth/guards";
import type { PlatformRole } from "@prisma/client";

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function hasSuperadminAccess(user: { email: string; platformRole: PlatformRole }) {
  return isSuperadmin(user.email) || user.platformRole === "SUPERADMIN";
}

export function isProductionContentAdmin(user: { email: string; platformRole: PlatformRole }) {
  return hasSuperadminAccess(user) || user.platformRole === "CONTENT_ADMIN";
}

export function isDemoManager(user: { email: string; platformRole: PlatformRole }) {
  return hasSuperadminAccess(user) || user.platformRole === "ADMIN";
}

/** @deprecated isProductionContentAdmin / isDemoManager */
export function isPlatformAdmin(user: { email: string; platformRole: PlatformRole }) {
  return isProductionContentAdmin(user) || isDemoManager(user);
}

/** @deprecated isPlatformAdmin 사용 */
export function canManageContent(user: { email: string; platformRole: PlatformRole }) {
  return isPlatformAdmin(user);
}

/** 하드 삭제·시스템 파괴적 작업 — SUPERADMIN만 */
export function canHardDelete(user: { email: string; platformRole: PlatformRole }) {
  return hasSuperadminAccess(user);
}

/** 플랫폼 ADMIN 부여/회수 — SUPERADMIN만 */
export function canGrantPlatformRoles(user: { email: string; platformRole: PlatformRole }) {
  return hasSuperadminAccess(user);
}

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

/** @deprecated requireProductionContentApi */
export async function requirePlatformAdminApi(): Promise<AdminUser | NextResponse> {
  return requireProductionContentApi();
}

/** @deprecated requirePlatformAdminApi */
export async function requireContentAdminApi() {
  return requirePlatformAdminApi();
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

export function isAdminResponse(result: AdminUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

export function auditActor(user: AdminUser) {
  return { id: user.id, email: user.email, platformRole: user.platformRole };
}

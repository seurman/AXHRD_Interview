import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin } from "@/lib/auth/guards";
import type { PlatformRole } from "@prisma/client";

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function hasSuperadminAccess(user: { email: string; platformRole: PlatformRole }) {
  return isSuperadmin(user.email) || user.platformRole === "SUPERADMIN";
}

export function canManageContent(user: { email: string; platformRole: PlatformRole }) {
  return hasSuperadminAccess(user) || user.platformRole === "CONTENT_ADMIN";
}

export async function requireContentAdminApi(): Promise<AdminUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!canManageContent(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  return user;
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

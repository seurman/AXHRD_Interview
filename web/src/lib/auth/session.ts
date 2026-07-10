/**
 * 세션 인증 — JWT httpOnly 쿠키
 */

import type { NextResponse } from "next/server";
import type { PlatformRole } from "@prisma/client";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isSuperadmin } from "@/lib/auth/superadmin";
import { syncSuperadminPlatformRole } from "@/lib/auth/platform-role";
import { sharedCookieBaseOptions } from "@/lib/auth/cookie-domain";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/jwt";

export { SESSION_COOKIE, createSessionToken };

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function sessionCookieSetOptions() {
  return {
    ...sharedCookieBaseOptions(),
    maxAge: SESSION_MAX_AGE,
  };
}

function sessionCookieClearOptions() {
  return {
    ...sharedCookieBaseOptions(),
    maxAge: 0,
  };
}

/** Route Handler 응답(redirect·JSON)에 세션 쿠키를 직접 붙인다 */
export async function applySessionCookie(response: NextResponse, userId: string) {
  const token = await createSessionToken(userId);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieSetOptions());
}

/** Route Handler 응답에서 세션 쿠키 삭제 — set과 동일 domain/path 필수 */
export function applyClearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", sessionCookieClearOptions());
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieSetOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  const base = sharedCookieBaseOptions();
  jar.delete({
    name: SESSION_COOKIE,
    path: base.path,
    ...(base.domain ? { domain: base.domain } : {}),
  });
}

/** layout + page가 같은 요청에서 중복 DB 조회하지 않도록 요청 단위 캐시 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) return null;

    if (isSuperadmin(user.email)) {
      await syncSuperadminPlatformRole(user.id, user.email);
      if (user.platformRole !== "SUPERADMIN") {
        return { ...user, platformRole: "SUPERADMIN" as PlatformRole };
      }
    }
    return user;
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth/session] getCurrentUser:", e);
    }
    return null;
  }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

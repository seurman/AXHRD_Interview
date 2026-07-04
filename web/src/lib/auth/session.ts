/**
 * 세션 인증 — JWT httpOnly 쿠키
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth/jwt";

export { SESSION_COOKIE, createSessionToken };

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth/session] getCurrentUser:", e);
    }
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

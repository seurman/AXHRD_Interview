/**
 * 세션 인증 — JWT httpOnly 쿠키 (NextAuth 없이 경량 구현)
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "hr_in_session";
const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me"
);

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    if (!userId) return null;

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

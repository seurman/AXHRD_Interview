import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "hr_in_session";
export const OAUTH_NEXT_COOKIE = "hr_in_oauth_next";

export function getJwtSecret() {
  const raw = process.env.NEXTAUTH_SECRET;
  if (process.env.NODE_ENV === "production" && !raw) {
    throw new Error("NEXTAUTH_SECRET must be set in production");
  }
  return new TextEncoder().encode(raw ?? "dev-secret-change-me");
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

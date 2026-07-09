import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/auth/jwt";

/** Edge middleware·API에서 공유 — Prisma 의존 없음 */
export const DEMO_PRESENTER_COOKIE = "hr_in_demo_presenter";

export async function createDemoPresenterToken(sessionId: string): Promise<string> {
  return new SignJWT({ sub: sessionId, typ: "demo_presenter" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(getJwtSecret());
}

export async function verifyDemoPresenterToken(
  token: string,
  sessionId: string,
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload.typ === "demo_presenter" && payload.sub === sessionId;
  } catch {
    return false;
  }
}

import { prisma } from "@/lib/prisma";

/** 로그인 성공 시 호출 — 기관 멤버 현황의 접속 정보에 사용 */
export async function recordUserLogin(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  } catch (e) {
    console.error("[auth] recordUserLogin", e);
  }
}

/** 로그아웃 시 호출 */
export async function recordUserLogout(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLogoutAt: new Date() },
    });
  } catch (e) {
    console.error("[auth] recordUserLogout", e);
  }
}

/**
 * 최근 로그인 후 아직 로그아웃되지 않았고, 24시간 이내면 "접속 중"으로 본다.
 * (정확한 실시간 presence는 아니며 기관 대시보드용 근사치)
 */
export function isLikelyOnline(
  lastLoginAt: Date | null | undefined,
  lastLogoutAt: Date | null | undefined,
  now = new Date(),
): boolean {
  if (!lastLoginAt) return false;
  const loginMs = lastLoginAt.getTime();
  if (now.getTime() - loginMs > 24 * 60 * 60 * 1000) return false;
  if (!lastLogoutAt) return true;
  return lastLogoutAt.getTime() < loginMs;
}

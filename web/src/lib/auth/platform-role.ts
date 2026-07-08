import { prisma } from "@/lib/prisma";
import type { PlatformRole } from "@prisma/client";
import { isSuperadmin } from "@/lib/auth/superadmin";

/** SUPERADMIN_EMAILS에 등록된 이메일이면 DB platformRole을 SUPERADMIN으로 맞춘다.
 *  Vercel 환경변수만 있고 DB가 NONE인 경우(또는 카카오 등 다른 이메일 계정) 메뉴가 안 보이는 문제를
 *  로그인 시점에 자동 해소한다. */
export async function syncSuperadminPlatformRole(userId: string, email: string) {
  if (!isSuperadmin(email)) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });
  if (!user || user.platformRole === "SUPERADMIN") return;

  await prisma.user.update({
    where: { id: userId },
    data: { platformRole: "SUPERADMIN" },
  });
}

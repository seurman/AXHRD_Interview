import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateJoinCode } from "@/lib/org/join-code";

/** ADMIN이 가입 코드를 재발급한다 (기존 코드가 외부에 유출됐을 때 등). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.orgRole !== "ADMIN" || !user.organizationId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const rl = checkRateLimit(`org:regen:${user.id}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let joinCode = generateJoinCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.organization.findUnique({ where: { joinCode } });
    if (!exists) break;
    joinCode = generateJoinCode();
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { joinCode },
  });

  return NextResponse.json({ joinCode });
}

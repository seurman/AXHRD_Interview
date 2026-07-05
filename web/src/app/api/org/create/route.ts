import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateJoinCode } from "@/lib/org/join-code";

/** 기관(대학 취업센터 등)을 새로 만들고 요청한 사용자를 ADMIN으로 지정한다. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`org:create:${user.id}`, 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (user.organizationId) {
    return NextResponse.json(
      { error: "이미 소속된 기관이 있습니다. 먼저 탈퇴 후 진행해 주세요." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "기관명을 입력해 주세요." }, { status: 400 });
  }
  if (name.length > 60) {
    return NextResponse.json({ error: "기관명이 너무 깁니다." }, { status: 400 });
  }

  // joinCode unique 충돌 시 재시도 (사실상 거의 발생하지 않음)
  let joinCode = generateJoinCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.organization.findUnique({ where: { joinCode } });
    if (!exists) break;
    joinCode = generateJoinCode();
  }

  // status는 스키마 기본값(PENDING) 사용 — 슈퍼어드민 승인 전까지는
  // 가입 코드로 학생을 받을 수 없고 코호트 대시보드도 열리지 않는다.
  const org = await prisma.organization.create({ data: { name, joinCode } });

  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: org.id, orgRole: "ADMIN" },
  });

  return NextResponse.json({
    organizationId: org.id,
    joinCode: org.joinCode,
    name: org.name,
    status: org.status,
  });
}

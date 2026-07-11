import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { canOrgAcceptMember } from "@/lib/org/contract";

/** 학생/구직자가 가입 코드를 입력해 기관에 소속된다 (STUDENT 권한). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`org:join:${user.id}`, 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (user.organizationId) {
    return NextResponse.json(
      { error: "이미 소속된 기관이 있습니다." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawCode = typeof body.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
  if (!rawCode) {
    return NextResponse.json({ error: "가입 코드를 입력해 주세요." }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { joinCode: rawCode },
    include: {
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        select: { planTier: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!org) {
    return NextResponse.json({ error: "유효하지 않은 가입 코드입니다." }, { status: 404 });
  }

  const accept = await canOrgAcceptMember(org);
  if (!accept.ok) {
    return NextResponse.json({ error: accept.reason }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { organizationId: org.id, orgRole: "MEMBER" },
  });

  return NextResponse.json({ organizationName: org.name });
}

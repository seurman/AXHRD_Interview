import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

/** 구성원 본인: 기관 담당자 피드백 목록 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!user.organizationId) {
    return NextResponse.json({ feedback: [] });
  }

  const rows = await prisma.orgMemberFeedback.findMany({
    where: { memberUserId: user.id, organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({
    feedback: rows.map((f) => ({
      id: f.id,
      body: f.body,
      authorName: f.author.name,
      createdAt: f.createdAt.toISOString(),
      readAt: f.readAt?.toISOString() ?? null,
    })),
  });
}

/** 구성원 본인: 미읽음 피드백 모두 읽음 처리 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await prisma.orgMemberFeedback.updateMany({
    where: {
      memberUserId: user.id,
      organizationId: user.organizationId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

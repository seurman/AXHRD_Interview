import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : undefined;

  const orConditions: Array<{ userId: string } | { organizationId: string }> = [
    { userId: user.id },
  ];
  if (user.organizationId) {
    orConditions.push({ organizationId: user.organizationId });
  }

  const sub = subscriptionId
    ? await prisma.subscription.findFirst({
        where: { id: subscriptionId, OR: orConditions },
      })
    : await prisma.subscription.findFirst({
        where: {
          OR: orConditions,
          status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
        },
        orderBy: { updatedAt: "desc" },
      });

  if (!sub) {
    return NextResponse.json({ error: "활성 구독을 찾을 수 없습니다." }, { status: 404 });
  }

  if (sub.cancelAtPeriodEnd) {
    return NextResponse.json({ message: "이미 해지 예약된 구독입니다." });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  return NextResponse.json({
    ok: true,
    cancelAtPeriodEnd: true,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    message: "현재 결제 주기 종료일까지 이용 가능합니다. 이후 자동 결제되지 않습니다.",
  });
}

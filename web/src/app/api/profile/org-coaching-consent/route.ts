import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!user.organizationId) {
    return NextResponse.json({ error: "소속 기관이 없습니다." }, { status: 400 });
  }

  const body = (await req.json()) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled 값이 필요합니다." }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      orgCoachingConsent: body.enabled,
      orgCoachingConsentAt: body.enabled ? new Date() : null,
    },
    select: {
      orgCoachingConsent: true,
      orgCoachingConsentAt: true,
    },
  });

  return NextResponse.json(updated);
}

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";

/** 역량 인증서 공개 공유 링크(slug)를 발급하거나 기존 것을 반환한다. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const rl = checkRateLimit(`certificate-link:${user.id}`, 5, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { certificateSlug: true },
  });

  if (existing?.certificateSlug) {
    return NextResponse.json({ slug: existing.certificateSlug });
  }

  const slug = randomBytes(9).toString("base64url");

  await prisma.user.update({
    where: { id: user.id },
    data: { certificateSlug: slug },
  });

  return NextResponse.json({ slug });
}

/** 공유 중단 — 슬러그를 폐기하고(랜덤 재발급 없이 null) 링크를 무효화한다. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { certificateSlug: null },
  });

  return NextResponse.json({ ok: true });
}

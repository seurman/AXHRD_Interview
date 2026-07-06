import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";

/** 슈퍼어드민이 대기 중인 기관 생성 요청을 반려한다. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date(), approvedAt: null },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

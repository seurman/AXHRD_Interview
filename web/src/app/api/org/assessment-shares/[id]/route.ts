import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolveAssessmentShareAccess } from "@/lib/org/assessment-share";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = { isActive?: boolean; label?: string };

/** 배포 링크 수정(활성/라벨) */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const access = await resolveAssessmentShareAccess(user);
  if (!access.allowed) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 404 });
  }
  const { id } = await params;

  const share = await prisma.orgAssessmentShare.findUnique({
    where: { id },
    select: { organizationId: true },
  });
  if (!share || share.organizationId !== access.organizationId) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다." }, { status: 404 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const data: { isActive?: boolean; label?: string } = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  await prisma.orgAssessmentShare.update({ where: { id }, data });
  return NextResponse.json({ updated: true });
}

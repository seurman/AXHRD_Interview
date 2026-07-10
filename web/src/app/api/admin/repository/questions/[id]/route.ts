import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    template?: string;
    level?: number;
    isActive?: boolean;
  } = {};

  if (typeof body.questionText === "string" && body.questionText.trim()) {
    data.template = body.questionText.trim();
  }
  if (typeof body.level === "number") {
    data.level = Math.min(5, Math.max(1, Math.round(body.level)));
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const question = await prisma.question.update({ where: { id }, data });
  return NextResponse.json({ question });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { _count: { select: { responses: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (existing._count.responses > 0) {
    const question = await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      question,
      message: "답변 기록이 있어 비활성화 처리했습니다.",
    });
  }

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true, softDeleted: false });
}

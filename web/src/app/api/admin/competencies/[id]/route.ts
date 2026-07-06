import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireContentAdminApi } from "@/lib/admin/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.competency.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    nameKo?: string;
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  } = {};

  if (typeof body.nameKo === "string" && body.nameKo.trim()) {
    data.nameKo = body.nameKo.trim();
  }
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const updated = await prisma.competency.update({ where: { id }, data });
  return NextResponse.json({ competency: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.competency.findUnique({
    where: { id },
    include: { questions: { select: { id: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const responseCount = await prisma.responseRecord.count({
    where: { question: { competencyId: id } },
  });

  if (responseCount > 0 || existing.questions.length > 0) {
    const updated = await prisma.competency.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      competency: updated,
      message: "답변 기록이 있어 비활성화 처리했습니다.",
    });
  }

  await prisma.competency.delete({ where: { id } });
  return NextResponse.json({ ok: true, softDeleted: false });
}

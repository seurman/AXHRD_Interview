import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requireContentAdminApi } from "@/lib/admin/auth";
import { parseFollowUpHints, parseRubricCriteria } from "@/lib/competency/bank";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "문항을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.template === "string" && body.template.trim()) {
    data.template = body.template.trim();
  }
  if (typeof body.level === "number" && body.level >= 1 && body.level <= 5) {
    data.level = body.level;
  }
  if (typeof body.difficulty === "number") data.difficulty = body.difficulty;
  if (typeof body.discrimination === "number") data.discrimination = body.discrimination;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.competencyId === "string") data.competencyId = body.competencyId;
  if (Array.isArray(body.rubricCriteria)) {
    data.rubricCriteria = body.rubricCriteria.filter(
      (c: unknown) => typeof c === "string" && c.trim()
    );
  }
  if (Array.isArray(body.followUpHints)) {
    data.followUpHints = body.followUpHints.filter(
      (h: unknown) => typeof h === "string" && h.trim()
    );
  }

  const updated = await prisma.question.update({ where: { id }, data });
  return NextResponse.json({
    question: {
      ...updated,
      followUpHints: parseFollowUpHints(updated.followUpHints),
      rubricCriteria: parseRubricCriteria(updated.rubricCriteria),
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireContentAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const responseCount = await prisma.responseRecord.count({ where: { questionId: id } });

  if (responseCount > 0) {
    const updated = await prisma.question.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, softDeleted: true, question: updated });
  }

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true, softDeleted: false });
}

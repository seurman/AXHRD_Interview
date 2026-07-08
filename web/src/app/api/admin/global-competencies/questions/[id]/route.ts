import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.globalCompetencyQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { questionText?: string; isActive?: boolean; sortOrder?: number } = {};
  if (typeof body.questionText === "string" && body.questionText.trim()) {
    data.questionText = body.questionText.trim();
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

  const updated = await prisma.globalCompetencyQuestion.update({ where: { id }, data });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "global_competency_question",
    entityId: id,
    summary: `글로벌 질문 수정: ${updated.externalId}`,
    beforeState: existing,
    afterState: updated,
  });

  return NextResponse.json({ question: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.globalCompetencyQuestion.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.globalCompetencyQuestion.update({
    where: { id },
    data: { isActive: false },
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "SOFT_DELETE",
    entityType: "global_competency_question",
    entityId: id,
    summary: `글로벌 질문 비활성: ${existing.externalId}`,
    beforeState: existing,
    afterState: updated,
  });

  return NextResponse.json({ ok: true });
}

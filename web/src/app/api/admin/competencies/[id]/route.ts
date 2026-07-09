import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  auditActor,
  canHardDelete,
  isAdminResponse,
  requirePlatformAdminApi,
} from "@/lib/admin/auth";
import { logAdminAudit, snapshotCompetency } from "@/lib/admin/audit";
import { parseRubricByLevel } from "@/lib/competency/rubric";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.competency.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const before = snapshotCompetency(existing);
  const body = await req.json().catch(() => ({}));
  const data: {
    nameKo?: string;
    nameEn?: string | null;
    description?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    clusterId?: string | null;
    source?: "NCS" | "GLOBAL" | "CUSTOM";
    rubricByLevel?: Prisma.InputJsonValue;
  } = {};

  if (typeof body.nameKo === "string" && body.nameKo.trim()) {
    data.nameKo = body.nameKo.trim();
  }
  if (body.nameEn !== undefined) {
    data.nameEn = typeof body.nameEn === "string" ? body.nameEn.trim() || null : null;
  }
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.clusterId !== undefined) {
    data.clusterId = typeof body.clusterId === "string" ? body.clusterId : null;
  }
  if (typeof body.source === "string" && ["NCS", "GLOBAL", "CUSTOM"].includes(body.source)) {
    data.source = body.source as "NCS" | "GLOBAL" | "CUSTOM";
  }
  if (body.rubricByLevel !== undefined) {
    data.rubricByLevel = parseRubricByLevel(body.rubricByLevel) as Prisma.InputJsonValue;
  }

  const updated = await prisma.competency.update({ where: { id }, data });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "competency",
    entityId: id,
    summary: `역량 수정: ${updated.code}`,
    beforeState: before,
    afterState: snapshotCompetency(updated),
  });

  return NextResponse.json({ competency: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { id } = await params;
  const existing = await prisma.competency.findUnique({
    where: { id },
    include: { questions: { select: { id: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const before = snapshotCompetency(existing);
  const responseCount = await prisma.responseRecord.count({
    where: { question: { competencyId: id } },
  });

  const mustSoft =
    !canHardDelete(auth) || responseCount > 0 || existing.questions.length > 0;

  if (mustSoft) {
    const updated = await prisma.competency.update({
      where: { id },
      data: { isActive: false },
    });
    await logAdminAudit({
      actor: auditActor(auth),
      action: "SOFT_DELETE",
      entityType: "competency",
      entityId: id,
      summary: `역량 비활성화: ${existing.code}`,
      beforeState: before,
      afterState: snapshotCompetency(updated),
    });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      competency: updated,
      message: canHardDelete(auth)
        ? "답변 기록이 있어 비활성화 처리했습니다."
        : "ADMIN은 비활성화만 가능합니다. SUPERADMIN이 감사 로그에서 롤백할 수 있습니다.",
    });
  }

  await prisma.competency.delete({ where: { id } });
  await logAdminAudit({
    actor: auditActor(auth),
    action: "DELETE",
    entityType: "competency",
    entityId: id,
    summary: `역량 삭제: ${existing.code}`,
    beforeState: before,
    afterState: null,
  });
  return NextResponse.json({ ok: true, softDeleted: false });
}

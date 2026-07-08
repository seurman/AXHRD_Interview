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
  const existing = await prisma.globalCompetencyRubricLevel.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json({ error: "루브릭을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  if (typeof body.descriptionKo !== "string" || !body.descriptionKo.trim()) {
    return NextResponse.json({ error: "descriptionKo가 필요합니다." }, { status: 400 });
  }

  const updated = await prisma.globalCompetencyRubricLevel.update({
    where: { id },
    data: { descriptionKo: body.descriptionKo.trim() },
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "global_competency_rubric",
    entityId: id,
    summary: `글로벌 루브릭 L${updated.level} 수정`,
    beforeState: existing,
    afterState: updated,
  });

  return NextResponse.json({ level: updated });
}

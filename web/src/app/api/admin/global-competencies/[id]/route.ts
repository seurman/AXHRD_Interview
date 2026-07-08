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
  const existing = await prisma.globalCompetency.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    nameKo?: string;
    nameEn?: string;
    definition?: string;
    isActive?: boolean;
  } = {};

  if (typeof body.nameKo === "string" && body.nameKo.trim()) data.nameKo = body.nameKo.trim();
  if (typeof body.nameEn === "string" && body.nameEn.trim()) data.nameEn = body.nameEn.trim();
  if (typeof body.definition === "string" && body.definition.trim()) {
    data.definition = body.definition.trim();
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const updated = await prisma.globalCompetency.update({ where: { id }, data });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "UPDATE",
    entityType: "global_competency",
    entityId: id,
    summary: `글로벌 역량 수정: ${updated.code}`,
    beforeState: existing,
    afterState: updated,
  });

  return NextResponse.json({ competency: updated });
}

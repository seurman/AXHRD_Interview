import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  auditActor,
  isAdminResponse,
  requireProductionContentApi,
} from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";

export async function POST(req: Request) {
  const auth = await requireProductionContentApi();
  if (isAdminResponse(auth)) return auth;

  const body = await req.json().catch(() => ({}));
  if (typeof body.competencyId !== "string" || typeof body.questionText !== "string") {
    return NextResponse.json(
      { error: "competencyId와 questionText가 필요합니다." },
      { status: 400 }
    );
  }

  const competency = await prisma.globalCompetency.findUnique({
    where: { id: body.competencyId },
  });
  if (!competency) {
    return NextResponse.json({ error: "역량을 찾을 수 없습니다." }, { status: 404 });
  }

  const count = await prisma.globalCompetencyQuestion.count({
    where: { competencyId: competency.id },
  });
  const externalId =
    typeof body.externalId === "string" && body.externalId.trim()
      ? body.externalId.trim()
      : `GLOB-${competency.code}-${String(count + 1).padStart(2, "0")}`;

  const created = await prisma.globalCompetencyQuestion.create({
    data: {
      competencyId: competency.id,
      externalId,
      questionText: body.questionText.trim(),
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : count + 1,
    },
  });

  await logAdminAudit({
    actor: auditActor(auth),
    action: "CREATE",
    entityType: "global_competency_question",
    entityId: created.id,
    summary: `글로벌 질문 추가: ${created.externalId}`,
    afterState: created,
  });

  return NextResponse.json({ question: created });
}

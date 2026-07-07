import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditActor, isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";

export async function POST(req: Request) {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const { competencyId, level, rubricCriteria } = await req.json();
  if (!competencyId || !level || !Array.isArray(rubricCriteria)) {
    return NextResponse.json({ error: "competencyId, level, rubricCriteria 필요" }, { status: 400 });
  }

  const levelNum = Number(level);
  const criteria = rubricCriteria.filter((c: unknown) => typeof c === "string" && c.trim());

  const beforeQuestions = await prisma.question.findMany({
    where: { competencyId, level: levelNum },
    select: { id: true, externalId: true, rubricCriteria: true },
  });

  const result = await prisma.question.updateMany({
    where: { competencyId, level: levelNum },
    data: { rubricCriteria: criteria as Prisma.InputJsonValue },
  });

  if (result.count > 0) {
    const comp = await prisma.competency.findUnique({
      where: { id: competencyId },
      select: { code: true },
    });
    await logAdminAudit({
      actor: auditActor(auth),
      action: "UPDATE",
      entityType: "question_rubric_bulk",
      entityId: competencyId,
      summary: `레벨 ${levelNum} 문항 루브릭 일괄 적용 (${result.count}건) · ${comp?.code ?? competencyId}`,
      beforeState: {
        competencyId,
        level: levelNum,
        items: beforeQuestions.map((q) => ({
          id: q.id,
          externalId: q.externalId,
          rubricCriteria: q.rubricCriteria,
        })),
      },
      afterState: { rubricCriteria: criteria, count: result.count },
    });
  }

  return NextResponse.json({ ok: true, count: result.count });
}

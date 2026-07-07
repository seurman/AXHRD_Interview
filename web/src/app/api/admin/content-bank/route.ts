import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminResponse, requirePlatformAdminApi } from "@/lib/admin/auth";
import { parseFollowUpHints, parseRubricCriteria } from "@/lib/competency/bank";

export async function GET() {
  const auth = await requirePlatformAdminApi();
  if (isAdminResponse(auth)) return auth;

  const [competencies, questions] = await Promise.all([
    prisma.competency.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { questions: true } } },
    }),
    prisma.question.findMany({
      orderBy: [
        { competencyId: "asc" },
        { level: "asc" },
        { sortOrder: "asc" },
        { externalId: "asc" },
      ],
      include: { competency: { select: { code: true } } },
    }),
  ]);

  return NextResponse.json({
    competencies: competencies.map((c) => ({
      id: c.id,
      code: c.code,
      nameKo: c.nameKo,
      description: c.description,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      questionCount: c._count.questions,
    })),
    questions: questions.map((q) => ({
      id: q.id,
      externalId: q.externalId,
      competencyId: q.competencyId,
      competencyCode: q.competency.code,
      level: q.level,
      template: q.template,
      difficulty: q.difficulty,
      discrimination: q.discrimination,
      followUpHints: parseFollowUpHints(q.followUpHints),
      rubricCriteria: parseRubricCriteria(q.rubricCriteria),
      isActive: q.isActive,
      sortOrder: q.sortOrder,
    })),
  });
}

import { prisma } from "@/lib/prisma";
import { parseFollowUpHints, parseRubricCriteria } from "@/lib/competency/bank";

/** /admin/content · ContentBankEditor와 동일한 스냅샷 — SaaS 킷 빌더도 같은 데이터 사용 */
export async function loadContentBankSnapshot() {
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

  return {
    competencies: competencies.map((c) => ({
      id: c.id,
      code: c.code,
      nameKo: c.nameKo,
      description: c.description,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      rubricByLevel: c.rubricByLevel,
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
  };
}

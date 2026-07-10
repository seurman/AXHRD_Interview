import { prisma } from "@/lib/prisma";
import type { RubricDetailRow } from "@/lib/competency/rubric-ssot";

export type QuestionRubricContext = {
  mappedDetails: RubricDetailRow[] | null;
  defaultDetails: RubricDetailRow[] | null;
};

function mapDetails(
  rows: Array<{
    scoreLevel: number;
    levelName: string | null;
    behavioralIndicator: string;
  }>,
): RubricDetailRow[] {
  return rows.map((d) => ({
    scoreLevel: d.scoreLevel,
    levelName: d.levelName,
    behavioralIndicator: d.behavioralIndicator,
  }));
}

/** 문항 ID 배치로 RubricSet 컨텍스트 로드 (면접 런타임용) */
export async function loadRubricContextByQuestionIds(
  questionIds: string[],
): Promise<Map<string, QuestionRubricContext>> {
  const out = new Map<string, QuestionRubricContext>();
  if (questionIds.length === 0) return out;

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, competencyId: true },
  });
  const competencyIds = [...new Set(questions.map((q) => q.competencyId))];

  const [mappings, defaultSets] = await Promise.all([
    prisma.questionRubricMapping.findMany({
      where: { questionId: { in: questionIds } },
      include: {
        rubricSet: {
          include: { details: { orderBy: { scoreLevel: "desc" } } },
        },
      },
    }),
    prisma.rubricSet.findMany({
      where: {
        competencyId: { in: competencyIds },
        organizationId: null,
        isDefault: true,
      },
      include: { details: { orderBy: { scoreLevel: "desc" } } },
    }),
  ]);

  const defaultByCompetency = new Map(
    defaultSets.map((s) => [s.competencyId, mapDetails(s.details)]),
  );

  const mappedByQuestion = new Map<string, RubricDetailRow[]>();
  for (const m of mappings) {
    if (!mappedByQuestion.has(m.questionId)) {
      mappedByQuestion.set(m.questionId, mapDetails(m.rubricSet.details));
    }
  }

  for (const q of questions) {
    out.set(q.id, {
      mappedDetails: mappedByQuestion.get(q.id) ?? null,
      defaultDetails: defaultByCompetency.get(q.competencyId) ?? null,
    });
  }

  return out;
}

export async function loadRubricContextForQuestion(
  questionId: string,
): Promise<QuestionRubricContext> {
  const map = await loadRubricContextByQuestionIds([questionId]);
  return map.get(questionId) ?? { mappedDetails: null, defaultDetails: null };
}

/** 역량별 플랫폼 기본 RubricSet → rubricByLevel (킷·CMS 호환) */
export async function loadDefaultRubricByLevelForCompetencies(
  competencyIds: string[],
): Promise<Map<string, import("@/lib/competency/rubric").RubricByLevel>> {
  const { rubricByLevelFromDetails } = await import("@/lib/competency/rubric-ssot");
  const sets = await prisma.rubricSet.findMany({
    where: {
      competencyId: { in: competencyIds },
      organizationId: null,
      isDefault: true,
    },
    include: { details: { orderBy: { scoreLevel: "desc" } } },
  });

  return new Map(
    sets.map((s) => [
      s.competencyId,
      rubricByLevelFromDetails(
        s.details.map((d) => ({
          scoreLevel: d.scoreLevel,
          levelName: d.levelName,
          behavioralIndicator: d.behavioralIndicator,
        })),
      ),
    ]),
  );
}

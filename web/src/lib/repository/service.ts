import type { CompetencyLifecycleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  lifecycleToIsActive,
  platformCompetencyWhere,
  type RepositoryCompetencyRow,
} from "@/lib/repository/types";

export async function listRepositoryCompetencies(
  statusFilter?: CompetencyLifecycleStatus | "ALL",
): Promise<RepositoryCompetencyRow[]> {
  const rows = await prisma.competency.findMany({
    where: {
      ...platformCompetencyWhere,
      ...(statusFilter && statusFilter !== "ALL" ? { lifecycleStatus: statusFilter } : {}),
    },
    include: {
      cluster: { select: { nameKo: true } },
      _count: { select: { questions: true } },
    },
    orderBy: [{ lifecycleStatus: "asc" }, { sortOrder: "asc" }, { code: "asc" }],
  });

  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    category: c.cluster?.nameKo ?? c.source,
    description: c.description,
    lifecycleStatus: c.lifecycleStatus,
    isActive: c.isActive,
    source: c.source,
    questionCount: c._count.questions,
  }));
}

export async function createRepositoryCompetency(input: {
  code: string;
  nameKo: string;
  category?: string;
  description?: string | null;
  clusterId?: string | null;
}) {
  return prisma.competency.create({
    data: {
      code: input.code,
      nameKo: input.nameKo,
      description: input.description ?? null,
      clusterId: input.clusterId ?? null,
      source: "CUSTOM",
      ownerScope: "PLATFORM",
      organizationId: null,
      lifecycleStatus: "DRAFT",
      isActive: false,
    },
  });
}

export async function setCompetencyLifecycle(
  id: string,
  lifecycleStatus: CompetencyLifecycleStatus,
) {
  return prisma.competency.update({
    where: { id },
    data: {
      lifecycleStatus,
      isActive: lifecycleToIsActive(lifecycleStatus),
    },
  });
}

export async function deleteRepositoryCompetency(id: string) {
  const comp = await prisma.competency.findUnique({
    where: { id },
    include: { _count: { select: { questions: true } } },
  });
  if (!comp) return { ok: false as const, error: "역량을 찾을 수 없습니다.", status: 404 };
  if (comp._count.questions > 0) {
    return {
      ok: false as const,
      error: `연결된 질문 ${comp._count.questions}개가 있어 삭제할 수 없습니다. 먼저 질문을 옮기거나 삭제하세요.`,
      status: 400,
    };
  }
  await prisma.competency.delete({ where: { id } });
  return { ok: true as const };
}

export async function validateCompetencyRubrics(competencyId: string) {
  const questions = await prisma.question.findMany({
    where: {
      competencyId,
      isActive: true,
      ownerScope: "PLATFORM",
      organizationId: null,
    },
    include: {
      rubricMappings: { select: { id: true, rubricSetId: true } },
    },
    orderBy: [{ level: "asc" }, { externalId: "asc" }],
  });

  const missing = questions.filter((q) => q.rubricMappings.length === 0);
  const rubricCriteriaEmpty = questions.filter((q) => {
    const criteria = q.rubricCriteria;
    return (
      q.rubricMappings.length === 0 &&
      (!Array.isArray(criteria) || criteria.length === 0)
    );
  });

  return {
    totalQuestions: questions.length,
    missingMappingCount: missing.length,
    missingQuestions: missing.map((q) => ({
      id: q.id,
      externalId: q.externalId,
      questionText: q.template,
      level: q.level,
    })),
    ok: missing.length === 0,
  };
}

export async function upsertRubricSet(input: {
  id?: string;
  organizationId?: string | null;
  competencyId: string;
  rubricName: string;
  scoringSystem: import("@prisma/client").RubricScoringSystem;
  isDefault?: boolean;
  details: Array<{
    scoreLevel: number;
    levelName?: string | null;
    behavioralIndicator: string;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.rubricSet.updateMany({
        where: {
          competencyId: input.competencyId,
          organizationId: input.organizationId ?? null,
          ...(input.id ? { id: { not: input.id } } : {}),
        },
        data: { isDefault: false },
      });
    }

    const set = input.id
      ? await tx.rubricSet.update({
          where: { id: input.id },
          data: {
            rubricName: input.rubricName,
            scoringSystem: input.scoringSystem,
            isDefault: input.isDefault ?? false,
            organizationId: input.organizationId ?? null,
          },
        })
      : await tx.rubricSet.create({
          data: {
            competencyId: input.competencyId,
            organizationId: input.organizationId ?? null,
            rubricName: input.rubricName,
            scoringSystem: input.scoringSystem,
            isDefault: input.isDefault ?? false,
          },
        });

    await tx.rubricDetail.deleteMany({ where: { rubricSetId: set.id } });
    if (input.details.length > 0) {
      await tx.rubricDetail.createMany({
        data: input.details.map((d) => ({
          rubricSetId: set.id,
          scoreLevel: d.scoreLevel,
          levelName: d.levelName ?? null,
          behavioralIndicator: d.behavioralIndicator.trim(),
        })),
      });
    }

    return tx.rubricSet.findUniqueOrThrow({
      where: { id: set.id },
      include: {
        details: { orderBy: { scoreLevel: "desc" } },
        organization: { select: { id: true, name: true } },
        _count: { select: { questionMappings: true } },
      },
    });
  });
}

export async function listRubricSetsForCompetency(competencyId: string) {
  return prisma.rubricSet.findMany({
    where: { competencyId },
    include: {
      details: { orderBy: { scoreLevel: "desc" } },
      organization: { select: { id: true, name: true } },
      _count: { select: { questionMappings: true } },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function mapQuestionToRubric(questionId: string, rubricSetId: string) {
  return prisma.questionRubricMapping.upsert({
    where: { questionId_rubricSetId: { questionId, rubricSetId } },
    create: { questionId, rubricSetId },
    update: {},
  });
}

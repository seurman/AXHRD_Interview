import type { CompetencyLifecycleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseRubricCriteria } from "@/lib/competency/bank";
import {
  legacyRubricLevels,
  legacyRubricToDetails,
  resolveQuestionCoverage,
  type QuestionCoverageKind,
} from "@/lib/repository/coverage";
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
  const competency = await prisma.competency.findUnique({
    where: { id: competencyId },
    select: { rubricByLevel: true },
  });
  if (!competency) {
    return {
      totalQuestions: 0,
      missingMappingCount: 0,
      missingQuestions: [],
      ok: true,
      coverage: { mapped: 0, question_criteria: 0, competency_level: 0, missing: 0 },
      needsNormalizedMapping: 0,
    };
  }

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

  const coverage = { mapped: 0, question_criteria: 0, competency_level: 0, missing: 0 };
  const missingQuestions: Array<{
    id: string;
    externalId: string;
    questionText: string;
    level: number;
    coverageKind: QuestionCoverageKind;
  }> = [];

  for (const q of questions) {
    const resolved = resolveQuestionCoverage({
      level: q.level,
      rubricCriteria: q.rubricCriteria,
      rubricByLevel: competency.rubricByLevel,
      mappedRubricSetId: q.rubricMappings[0]?.rubricSetId ?? null,
    });
    coverage[resolved.kind] += 1;
    if (resolved.kind === "missing") {
      missingQuestions.push({
        id: q.id,
        externalId: q.externalId,
        questionText: q.template,
        level: q.level,
        coverageKind: resolved.kind,
      });
    }
  }

  const needsNormalizedMapping = questions.filter((q) => q.rubricMappings.length === 0).length;

  return {
    totalQuestions: questions.length,
    missingMappingCount: missingQuestions.length,
    missingQuestions,
    needsNormalizedMapping,
    coverage,
    ok: missingQuestions.length === 0,
  };
}

export async function getCompetencyWorkspace(competencyId: string) {
  const competency = await prisma.competency.findFirst({
    where: { id: competencyId, ...platformCompetencyWhere },
    include: {
      cluster: { select: { nameKo: true, code: true } },
      _count: { select: { questions: true, rubricSets: true } },
    },
  });
  if (!competency) return null;

  const [rubricSets, questions, validation] = await Promise.all([
    listRubricSetsForCompetency(competencyId),
    prisma.question.findMany({
      where: {
        competencyId,
        isActive: true,
        ownerScope: "PLATFORM",
        organizationId: null,
      },
      include: {
        rubricMappings: {
          include: { rubricSet: { select: { id: true, rubricName: true } } },
        },
      },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { externalId: "asc" }],
    }),
    validateCompetencyRubrics(competencyId),
  ]);

  const legacyLevels = legacyRubricLevels(competency.rubricByLevel);

  return {
    competency: {
      id: competency.id,
      code: competency.code,
      nameKo: competency.nameKo,
      description: competency.description,
      lifecycleStatus: competency.lifecycleStatus,
      isActive: competency.isActive,
      source: competency.source,
      category: competency.cluster?.nameKo ?? competency.source,
      clusterCode: competency.cluster?.code ?? null,
      questionCount: competency._count.questions,
      rubricSetCount: competency._count.rubricSets,
    },
    legacyRubric: {
      levels: legacyLevels,
      hasData: legacyLevels.length > 0,
    },
    rubricSets,
    questions: questions.map((q) => {
      const mapped = q.rubricMappings[0]?.rubricSet ?? null;
      const rubricCriteria = parseRubricCriteria(q.rubricCriteria);
      const coverage = resolveQuestionCoverage({
        level: q.level,
        rubricCriteria: q.rubricCriteria,
        rubricByLevel: competency.rubricByLevel,
        mappedRubricSetId: mapped?.id ?? null,
      });
      return {
        id: q.id,
        externalId: q.externalId,
        template: q.template,
        level: q.level,
        difficulty: q.difficulty,
        rubricCriteria,
        coverage,
        mappedRubric: mapped,
      };
    }),
    validation,
  };
}

export async function importLegacyRubricSet(competencyId: string) {
  const competency = await prisma.competency.findUnique({
    where: { id: competencyId },
    select: { id: true, nameKo: true, code: true, rubricByLevel: true },
  });
  if (!competency) return { ok: false as const, error: "역량을 찾을 수 없습니다.", status: 404 };

  const details = legacyRubricToDetails(competency.rubricByLevel);
  if (details.length === 0) {
    return {
      ok: false as const,
      error: "역량에 저장된 L-루브릭(rubricByLevel)이 없습니다. 문항 뱅크 CMS에서 먼저 편집하세요.",
      status: 400,
    };
  }

  const existing = await prisma.rubricSet.findFirst({
    where: {
      competencyId,
      organizationId: null,
      rubricName: `${competency.nameKo} 플랫폼 표준`,
    },
  });

  const rubricSet = await upsertRubricSet({
    id: existing?.id,
    competencyId,
    organizationId: null,
    rubricName: `${competency.nameKo} 플랫폼 표준`,
    scoringSystem: "FIVE_SCALE",
    isDefault: true,
    details,
  });

  return { ok: true as const, rubricSet };
}

export async function bulkMapQuestionsToDefaultRubric(competencyId: string) {
  const defaultSet = await prisma.rubricSet.findFirst({
    where: { competencyId, organizationId: null, isDefault: true },
    orderBy: { createdAt: "asc" },
  });
  if (!defaultSet) {
    return {
      ok: false as const,
      error: "플랫폼 기본 루브릭 세트가 없습니다. 먼저 루브릭을 생성하거나 기존 역량 루브릭을 가져오세요.",
      status: 400,
    };
  }

  const questions = await prisma.question.findMany({
    where: {
      competencyId,
      isActive: true,
      ownerScope: "PLATFORM",
      organizationId: null,
    },
    include: { rubricMappings: { select: { id: true } } },
  });

  const unmapped = questions.filter((q) => q.rubricMappings.length === 0);
  if (unmapped.length === 0) {
    return { ok: true as const, mappedCount: 0, rubricSetId: defaultSet.id };
  }

  await prisma.$transaction(
    unmapped.map((q) =>
      prisma.questionRubricMapping.upsert({
        where: {
          questionId_rubricSetId: { questionId: q.id, rubricSetId: defaultSet.id },
        },
        create: { questionId: q.id, rubricSetId: defaultSet.id },
        update: {},
      }),
    ),
  );

  return { ok: true as const, mappedCount: unmapped.length, rubricSetId: defaultSet.id };
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

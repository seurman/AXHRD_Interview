import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import coreQuestionSeed from "@/data/ncs/questions.json";
import extendedQuestionSeed from "@/data/ncs/ncs-extended.json";
import ncsRubricsSeed from "@/data/ncs/ncs-rubrics.json";
import { findPlatformCompetencyByCode } from "@/lib/content/ownership";
import { normalizeImportLevels, parseRubricImportFile } from "@/lib/competency/rubric";
import { COMPETENCY_CODES } from "@/types";

type SeedQuestion = {
  externalId: string;
  competency: string;
  level: number;
  difficulty: number;
  discrimination: number;
  template: string;
  followUpHints?: string[];
};

type SeedCompetency = {
  code: string;
  nameKo: string;
  description: string;
};

type QuestionSeedFile = {
  competencies: SeedCompetency[];
  questions: SeedQuestion[];
};

async function ensureNcsCluster(prisma: PrismaClient) {
  const cluster = await prisma.competencyCluster.upsert({
    where: { code: "NCS_IRT" },
    create: {
      code: "NCS_IRT",
      nameKo: "NCS · IRT 면접",
      nameEn: "NCS IRT Interview",
      description: "국가직무능력표준 직업기초능력 — 모의면접 IRT",
      source: "NCS",
      sortOrder: 0,
      isActive: true,
    },
    update: {
      nameKo: "NCS · IRT 면접",
      source: "NCS",
      isActive: true,
    },
  });

  await prisma.competency.updateMany({
    where: {
      code: { in: [...COMPETENCY_CODES] },
      ownerScope: "PLATFORM",
      organizationId: null,
    },
    data: { clusterId: cluster.id, source: "NCS" },
  });

  return cluster;
}

/** NCS 6+4 역량 · 문항 · L1~5 루브릭을 플랫폼 뱅크에 동기화 */
export async function syncNcsCompetencyBank(prisma?: PrismaClient) {
  const db = prisma ?? (await import("@/lib/prisma")).prisma;
  await ensureNcsCluster(db);

  const cluster = await db.competencyCluster.findUnique({
    where: { code: "NCS_IRT" },
  });
  if (!cluster) throw new Error("NCS_IRT cluster missing");

  const core = coreQuestionSeed as QuestionSeedFile;
  const extended = extendedQuestionSeed as QuestionSeedFile;
  const rubrics = parseRubricImportFile(ncsRubricsSeed);

  const competencies = [...core.competencies, ...extended.competencies];
  const questions = [...core.questions, ...extended.questions];

  const rubricByCode = new Map(
    (rubrics?.competencies ?? []).map((r) => [r.code.trim().toUpperCase(), r.levels]),
  );

  let competencyCount = 0;
  let questionCount = 0;

  for (let i = 0; i < competencies.length; i++) {
    const comp = competencies[i];
    const code = comp.code.trim().toUpperCase();
    const levels = rubricByCode.get(code);
    const rubricByLevel = levels ? normalizeImportLevels(levels) : {};

    const existing = await findPlatformCompetencyByCode(code);
    const competencyData = {
      nameKo: comp.nameKo,
      description: comp.description,
      sortOrder: i,
      isActive: true,
      lifecycleStatus: "ACTIVE" as const,
      clusterId: cluster.id,
      source: "NCS" as const,
      ...(Object.keys(rubricByLevel).length > 0
        ? { rubricByLevel: rubricByLevel as Prisma.InputJsonValue }
        : {}),
    };

    if (existing) {
      await db.competency.update({
        where: { id: existing.id },
        data: competencyData,
      });
    } else {
      await db.competency.create({
        data: {
          code,
          ownerScope: "PLATFORM",
          organizationId: null,
          rubricByLevel: rubricByLevel as Prisma.InputJsonValue,
          ...competencyData,
        },
      });
    }
    competencyCount += 1;
  }

  const sortCounters: Record<string, number> = {};
  for (const q of questions) {
    const code = q.competency.trim().toUpperCase();
    const competency = await db.competency.findFirst({
      where: { code, ownerScope: "PLATFORM", organizationId: null },
    });
    if (!competency) continue;

    const sortKey = `${code}-L${q.level}`;
    const sortOrder = sortCounters[sortKey] ?? 0;
    sortCounters[sortKey] = sortOrder + 1;

    const normalizedRubric = rubricByCode.get(code);
    const rubricByLevel = normalizedRubric ? normalizeImportLevels(normalizedRubric) : {};
    const rubricCriteria = rubricByLevel[String(q.level)] ?? [];

    await db.question.upsert({
      where: { externalId: q.externalId },
      update: {
        competencyId: competency.id,
        level: q.level,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        template: q.template,
        followUpHints: q.followUpHints ?? [],
        sortOrder,
        isActive: true,
        ...(rubricCriteria?.length
          ? { rubricCriteria: rubricCriteria as Prisma.InputJsonValue }
          : {}),
      },
      create: {
        externalId: q.externalId,
        competencyId: competency.id,
        level: q.level,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        template: q.template,
        followUpHints: q.followUpHints ?? [],
        sortOrder,
        isActive: true,
        rubricCriteria: (rubricCriteria ?? []) as Prisma.InputJsonValue,
      },
    });
    questionCount += 1;
  }

  return {
    competencies: competencyCount,
    questions: questionCount,
    clusterCode: cluster.code,
  };
}

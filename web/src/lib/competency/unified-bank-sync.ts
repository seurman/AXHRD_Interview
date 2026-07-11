import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncNcsCompetencyBank } from "@/lib/competency/ncs-bank-sync";
import { COMPETENCY_CODES } from "@/types";
import {
  findPlatformCompetencyByCode,
  platformCompetencyUniqueWhere,
} from "@/lib/content/ownership";

/** L1–L5 → rough IRT difficulty */
export function difficultyForLevel(level: number): number {
  const map: Record<number, number> = {
    1: -1.4,
    2: -0.6,
    3: 0,
    4: 0.7,
    5: 1.4,
  };
  return map[level] ?? 0;
}

export function levelFromExternalId(externalId: string, fallbackIndex = 0): number {
  const m = /(?:^|-)L([1-5])(?:-|$)/i.exec(externalId);
  if (m) return Number(m[1]);
  return (fallbackIndex % 5) + 1;
}

function rubricFromGlobalLevels(
  levels: Array<{ level: number; descriptionKo: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const lv of levels) {
    const lines = lv.descriptionKo
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    out[String(lv.level)] = lines.length > 0 ? lines : [lv.descriptionKo];
  }
  return out;
}

/** NCS 6역량 클러스터 연결 */
export async function ensureNcsClusterLinks(): Promise<void> {
  const cluster = await prisma.competencyCluster.upsert({
    where: { code: "NCS_IRT" },
    create: {
      code: "NCS_IRT",
      nameKo: "NCS · IRT 면접",
      nameEn: "NCS IRT Interview",
      description: "국가직무능력표준 기반 6역량 — 모의면접 IRT",
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
    data: {
      clusterId: cluster.id,
      source: "NCS",
    },
  });

  await prisma.competency.updateMany({
    where: {
      clusterId: null,
      OR: [{ source: "NCS" }, { code: { in: [...COMPETENCY_CODES] } }],
    },
    data: { clusterId: cluster.id, source: "NCS" },
  });
}

/**
 * GlobalCompetency* → 통합 Competency/Question 풀 (IRT 적용).
 * 글로벌 역량사전 테이블은 Meaning Layer·시드 원본으로 유지하고, 면접 뱅크는 여기서 동기화한다.
 */
export async function syncGlobalCompetenciesToUnifiedBank(): Promise<{
  clusters: number;
  competencies: number;
  questions: number;
}> {
  await ensureNcsClusterLinks();

  const globalClusters = await prisma.globalCompetencyCluster.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      competencies: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          rubricLevels: { orderBy: { level: "asc" } },
          questions: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
          benchmarks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  let sortBase =
    (await prisma.competency.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1;
  sortBase += 1;

  let competencyCount = 0;
  let questionCount = 0;

  for (const gCluster of globalClusters) {
    const cluster = await prisma.competencyCluster.upsert({
      where: { code: gCluster.code },
      create: {
        code: gCluster.code,
        nameKo: gCluster.nameKo,
        nameEn: gCluster.nameEn,
        description: gCluster.description,
        source: "GLOBAL",
        sortOrder: gCluster.sortOrder + 10,
        isActive: true,
      },
      update: {
        nameKo: gCluster.nameKo,
        nameEn: gCluster.nameEn,
        description: gCluster.description,
        source: "GLOBAL",
        isActive: true,
      },
    });

    for (const gc of gCluster.competencies) {
      const rubricByLevel = rubricFromGlobalLevels(gc.rubricLevels);
      const existing = await findPlatformCompetencyByCode(gc.code);
      const sortOrder = existing?.sortOrder ?? sortBase++;

      const comp = await prisma.competency.upsert({
        where: platformCompetencyUniqueWhere(gc.code),
        create: {
          code: gc.code,
          nameKo: gc.nameKo,
          nameEn: gc.nameEn,
          description: gc.definition,
          clusterId: cluster.id,
          source: "GLOBAL",
          sortOrder,
          isActive: true,
          ownerScope: "PLATFORM",
          organizationId: null,
          rubricByLevel: rubricByLevel as Prisma.InputJsonValue,
        },
        update: {
          nameKo: gc.nameKo,
          nameEn: gc.nameEn,
          description: gc.definition,
          clusterId: cluster.id,
          source: "GLOBAL",
          isActive: true,
          rubricByLevel: rubricByLevel as Prisma.InputJsonValue,
        },
      });
      competencyCount += 1;

      await prisma.competencyBenchmarkRef.deleteMany({ where: { competencyId: comp.id } });
      for (const [i, b] of gc.benchmarks.entries()) {
        await prisma.competencyBenchmarkRef.create({
          data: {
            competencyId: comp.id,
            frameworkName: b.frameworkName,
            refLabel: b.refLabel,
            refDefinition: b.refDefinition,
            sourceUrl: b.sourceUrl,
            licenseNote: b.licenseNote,
            sortOrder: b.sortOrder || i,
          },
        });
      }

      for (const [i, q] of gc.questions.entries()) {
        const level = levelFromExternalId(q.externalId, i);
        const rubricCriteria = rubricByLevel[String(level)] ?? [];
        await prisma.question.upsert({
          where: { externalId: q.externalId },
          create: {
            externalId: q.externalId,
            competencyId: comp.id,
            level,
            template: q.questionText,
            sortOrder: q.sortOrder || i,
            isActive: true,
            difficulty: difficultyForLevel(level),
            discrimination: 1,
            rubricCriteria: rubricCriteria as Prisma.InputJsonValue,
            followUpHints: [] as unknown as Prisma.InputJsonValue,
          },
          update: {
            competencyId: comp.id,
            level,
            template: q.questionText,
            sortOrder: q.sortOrder || i,
            isActive: true,
            difficulty: difficultyForLevel(level),
          },
        });
        questionCount += 1;
      }
    }
  }

  return {
    clusters: globalClusters.length + 1,
    competencies: competencyCount,
    questions: questionCount,
  };
}

export async function syncUnifiedCompetencyPool() {
  const ncs = await syncNcsCompetencyBank(prisma);
  const global = await syncGlobalCompetenciesToUnifiedBank();
  return {
    ncs,
    global,
    clusters: global.clusters,
    competencies: ncs.competencies + global.competencies,
    questions: ncs.questions + global.questions,
  };
}

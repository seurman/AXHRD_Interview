/**
 * Global competency dictionary seed (Spencer & Spencer–inspired clusters).
 * Loads seed/global-competencies.json + seed/global-competency-benchmarks.json
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type SeedQuestion = {
  externalId: string;
  questionText: string;
  sortOrder: number;
};

type SeedCompetency = {
  code: string;
  nameKo: string;
  nameEn: string;
  definition: string;
  sortOrder: number;
  levels: Record<string, string>;
  questions: SeedQuestion[];
};

type SeedCluster = {
  code: string;
  nameKo: string;
  nameEn: string;
  description?: string | null;
  sortOrder: number;
  competencies: SeedCompetency[];
};

type CompetenciesFile = {
  version: number;
  source: string;
  clusters: SeedCluster[];
};

type BenchmarkItem = {
  refLabel: string;
  refDefinition: string;
  competencyCodes: string[];
};

type BenchmarksFile = {
  version: number;
  frameworkName: string;
  sourceUrl: string;
  licenseNote: string;
  items: BenchmarkItem[];
};

async function main() {
  const competenciesPath = join(__dirname, "../../seed/global-competencies.json");
  const benchmarksPath = join(__dirname, "../../seed/global-competency-benchmarks.json");

  const compsFile = JSON.parse(readFileSync(competenciesPath, "utf-8")) as CompetenciesFile;
  const benchFile = JSON.parse(readFileSync(benchmarksPath, "utf-8")) as BenchmarksFile;

  if (!compsFile?.clusters?.length) {
    throw new Error("global-competencies.json has no clusters");
  }
  if (!benchFile?.items?.length) {
    throw new Error("global-competency-benchmarks.json has no items");
  }

  let clusterCount = 0;
  let competencyCount = 0;
  let levelCount = 0;
  let questionCount = 0;

  for (const cluster of compsFile.clusters) {
    const upsertedCluster = await prisma.globalCompetencyCluster.upsert({
      where: { code: cluster.code },
      create: {
        code: cluster.code,
        nameKo: cluster.nameKo,
        nameEn: cluster.nameEn,
        description: cluster.description ?? null,
        sortOrder: cluster.sortOrder,
        isActive: true,
      },
      update: {
        nameKo: cluster.nameKo,
        nameEn: cluster.nameEn,
        description: cluster.description ?? null,
        sortOrder: cluster.sortOrder,
        isActive: true,
      },
    });
    clusterCount += 1;

    for (const comp of cluster.competencies) {
      const upsertedComp = await prisma.globalCompetency.upsert({
        where: { code: comp.code },
        create: {
          clusterId: upsertedCluster.id,
          code: comp.code,
          nameKo: comp.nameKo,
          nameEn: comp.nameEn,
          definition: comp.definition,
          sortOrder: comp.sortOrder,
          isActive: true,
        },
        update: {
          clusterId: upsertedCluster.id,
          nameKo: comp.nameKo,
          nameEn: comp.nameEn,
          definition: comp.definition,
          sortOrder: comp.sortOrder,
          isActive: true,
        },
      });
      competencyCount += 1;

      for (const [levelKey, descriptionRaw] of Object.entries(comp.levels)) {
        const level = Number(levelKey);
        if (!Number.isFinite(level) || level < 1 || level > 5) continue;

        const descriptionKo = Array.isArray(descriptionRaw)
          ? descriptionRaw.filter((s) => typeof s === "string" && s.trim()).join("\n")
          : String(descriptionRaw ?? "");

        await prisma.globalCompetencyRubricLevel.upsert({
          where: {
            competencyId_level: {
              competencyId: upsertedComp.id,
              level,
            },
          },
          create: {
            competencyId: upsertedComp.id,
            level,
            descriptionKo,
          },
          update: {
            descriptionKo,
          },
        });
        levelCount += 1;
      }

      // Replace questions for this competency so old 2-item seeds don't linger
      await prisma.globalCompetencyQuestion.deleteMany({
        where: { competencyId: upsertedComp.id },
      });

      for (const q of comp.questions) {
        await prisma.globalCompetencyQuestion.create({
          data: {
            competencyId: upsertedComp.id,
            externalId: q.externalId,
            questionText: q.questionText,
            sortOrder: q.sortOrder,
            isActive: true,
          },
        });
        questionCount += 1;
      }
    }
  }

  // Replace benchmark refs: delete existing for mapped competencies, then recreate
  const allMappedCodes = [
    ...new Set(benchFile.items.flatMap((item) => item.competencyCodes)),
  ];
  const mappedComps = await prisma.globalCompetency.findMany({
    where: { code: { in: allMappedCodes } },
    select: { id: true, code: true },
  });
  const codeToId = new Map(mappedComps.map((c) => [c.code, c.id]));

  if (mappedComps.length > 0) {
    await prisma.globalCompetencyBenchmarkRef.deleteMany({
      where: { competencyId: { in: mappedComps.map((c) => c.id) } },
    });
  }

  let benchmarkRowCount = 0;
  let itemSort = 0;
  for (const item of benchFile.items) {
    itemSort += 1;
    for (const code of item.competencyCodes) {
      const competencyId = codeToId.get(code);
      if (!competencyId) {
        console.warn(`skip benchmark: competency not found — ${code} (${item.refLabel})`);
        continue;
      }
      await prisma.globalCompetencyBenchmarkRef.create({
        data: {
          competencyId,
          frameworkName: benchFile.frameworkName,
          refLabel: item.refLabel,
          refDefinition: item.refDefinition,
          sourceUrl: benchFile.sourceUrl,
          licenseNote: benchFile.licenseNote,
          sortOrder: itemSort,
        },
      });
      benchmarkRowCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        clusters: clusterCount,
        competencies: competencyCount,
        rubricLevels: levelCount,
        questions: questionCount,
        benchmarkItems: benchFile.items.length,
        benchmarkRows: benchmarkRowCount,
      },
      null,
      2
    )
  );

  const { syncUnifiedCompetencyPool } = await import("../src/lib/competency/unified-bank-sync");
  const synced = await syncUnifiedCompetencyPool();
  console.log("Unified IRT pool sync:", synced);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

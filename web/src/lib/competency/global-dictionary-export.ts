import { prisma } from "@/lib/prisma";

/** CASE — Competency Assessment Structured Exchange (글로벌 사전 이식 포맷) */
export type GlobalDictionaryCaseExport = {
  format: "axhrd-global-dictionary";
  version: 1;
  exportedAt: string;
  clusters: Array<{
    code: string;
    nameKo: string;
    nameEn: string;
    description: string | null;
    sortOrder: number;
    competencies: Array<{
      code: string;
      nameKo: string;
      nameEn: string;
      definition: string;
      sortOrder: number;
      rubricLevels: Array<{ level: number; descriptionKo: string }>;
      questions: Array<{
        externalId: string;
        questionText: string;
        sortOrder: number;
      }>;
      benchmarks: Array<{
        frameworkName: string;
        refLabel: string;
        refDefinition: string;
        sourceUrl: string;
        licenseNote: string;
      }>;
    }>;
  }>;
};

export async function buildGlobalDictionaryCaseExport(): Promise<GlobalDictionaryCaseExport> {
  const clusters = await prisma.globalCompetencyCluster.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      competencies: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          rubricLevels: { orderBy: { level: "asc" } },
          questions: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
          benchmarks: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  return {
    format: "axhrd-global-dictionary",
    version: 1,
    exportedAt: new Date().toISOString(),
    clusters: clusters.map((cluster) => ({
      code: cluster.code,
      nameKo: cluster.nameKo,
      nameEn: cluster.nameEn,
      description: cluster.description,
      sortOrder: cluster.sortOrder,
      competencies: cluster.competencies.map((comp) => ({
        code: comp.code,
        nameKo: comp.nameKo,
        nameEn: comp.nameEn,
        definition: comp.definition,
        sortOrder: comp.sortOrder,
        rubricLevels: comp.rubricLevels.map((lvl) => ({
          level: lvl.level,
          descriptionKo: lvl.descriptionKo,
        })),
        questions: comp.questions.map((q) => ({
          externalId: q.externalId,
          questionText: q.questionText,
          sortOrder: q.sortOrder,
        })),
        benchmarks: comp.benchmarks.map((b) => ({
          frameworkName: b.frameworkName,
          refLabel: b.refLabel,
          refDefinition: b.refDefinition,
          sourceUrl: b.sourceUrl,
          licenseNote: b.licenseNote,
        })),
      })),
    })),
  };
}

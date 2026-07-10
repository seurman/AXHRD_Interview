import { prisma } from "@/lib/prisma";
import { parseFollowUpHints, parseRubricCriteria } from "@/lib/competency/bank";
import { PLATFORM_OWNER_FILTER } from "@/lib/content/ownership";
import type { CompetencySource } from "@prisma/client";

export type BankCluster = {
  id: string;
  code: string;
  nameKo: string;
  nameEn: string | null;
  description: string | null;
  source: CompetencySource;
  sortOrder: number;
  isActive: boolean;
  competencyCount: number;
};

export type BankCompetencyRow = {
  id: string;
  code: string;
  nameKo: string;
  nameEn: string | null;
  description: string | null;
  clusterId: string | null;
  clusterCode: string | null;
  clusterNameKo: string | null;
  source: CompetencySource;
  sortOrder: number;
  isActive: boolean;
  rubricByLevel: unknown;
  questionCount: number;
};

/** 통합 역량 풀 스냅샷 — NCS·Global·Custom 모두 IRT Question과 1:1 */
export async function loadContentBankSnapshot() {
  try {
    return await loadContentBankSnapshotInner();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes("CompetencyCluster") ||
      msg.includes("does not exist") ||
      msg.includes("competencyCluster")
    ) {
      throw new Error(
        "통합 역량 풀 테이블이 없습니다. `cd web && npx prisma migrate deploy` 후 `npx tsx scripts/sync-unified-bank.ts` 를 실행해 주세요.",
      );
    }
    throw e;
  }
}

async function loadContentBankSnapshotInner() {
  const [clusters, competencies, questions] = await Promise.all([
    prisma.competencyCluster.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: { _count: { select: { competencies: true } } },
    }),
    prisma.competency.findMany({
      where: PLATFORM_OWNER_FILTER,
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      include: {
        cluster: { select: { code: true, nameKo: true } },
        _count: { select: { questions: true } },
      },
    }),
    prisma.question.findMany({
      where: { ownerScope: "PLATFORM", organizationId: null },
      orderBy: [
        { competencyId: "asc" },
        { level: "asc" },
        { sortOrder: "asc" },
        { externalId: "asc" },
      ],
      include: { competency: { select: { code: true } } },
    }),
  ]);

  const clusterRows: BankCluster[] = clusters.map((c) => ({
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    nameEn: c.nameEn,
    description: c.description,
    source: c.source,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    competencyCount: c._count.competencies,
  }));

  const competencyRows: BankCompetencyRow[] = competencies.map((c) => ({
    id: c.id,
    code: c.code,
    nameKo: c.nameKo,
    nameEn: c.nameEn,
    description: c.description,
    clusterId: c.clusterId,
    clusterCode: c.cluster?.code ?? null,
    clusterNameKo: c.cluster?.nameKo ?? null,
    source: c.source,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    rubricByLevel: c.rubricByLevel,
    questionCount: c._count.questions,
  }));

  return {
    clusters: clusterRows,
    competencies: competencyRows,
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

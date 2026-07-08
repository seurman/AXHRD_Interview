import { prisma } from "@/lib/prisma";
import { parseRubricByLevel, type RubricByLevel } from "@/lib/competency/rubric";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { Prisma } from "@prisma/client";

export type DemoCatalogSource = "ncs" | "global";

export type DemoCatalogQuestion = {
  externalId: string;
  level: number;
  template: string;
  sortOrder: number;
  rubricCriteria: string[];
};

export type DemoCatalogCompetency = {
  source: DemoCatalogSource;
  code: string;
  nameKo: string;
  description: string | null;
  clusterCode?: string;
  clusterNameKo?: string;
  questionCount: number;
  rubricByLevel: RubricByLevel;
  questions: DemoCatalogQuestion[];
};

export type DemoCatalogCluster = {
  source: DemoCatalogSource;
  code: string;
  nameKo: string;
  description: string | null;
  competencies: DemoCatalogCompetency[];
};

/** Business Objects식 좌측 메타데이터 팔레트 — NCS 6 + Global 20 */
export async function loadDemoCatalogMetadata(): Promise<{
  clusters: DemoCatalogCluster[];
  totals: { ncs: number; global: number };
}> {
  const [ncsComps, ncsQuestions, globalClusters] = await Promise.all([
    prisma.competency.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.question.findMany({
      where: { isActive: true },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      include: { competency: { select: { code: true } } },
    }),
    prisma.globalCompetencyCluster.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        competencies: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            rubricLevels: { orderBy: { level: "asc" } },
            questions: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
          },
        },
      },
    }),
  ]);

  const qsByComp = new Map<string, typeof ncsQuestions>();
  for (const q of ncsQuestions) {
    const list = qsByComp.get(q.competencyId) ?? [];
    list.push(q);
    qsByComp.set(q.competencyId, list);
  }

  const ncsCluster: DemoCatalogCluster = {
    source: "ncs",
    code: "NCS_IRT",
    nameKo: "NCS · IRT 면접 (6)",
    description: "운영 문항 뱅크 — 모의면접 IRT용",
    competencies: ncsComps.map((c) => {
      const qs = qsByComp.get(c.id) ?? [];
      return {
        source: "ncs" as const,
        code: c.code,
        nameKo: c.nameKo,
        description: c.description,
        questionCount: qs.length,
        rubricByLevel: parseRubricByLevel(c.rubricByLevel),
        questions: qs.map((q) => ({
          externalId: q.externalId,
          level: q.level,
          template: q.template,
          sortOrder: q.sortOrder,
          rubricCriteria: parseRubricCriteria(q.rubricCriteria),
        })),
      };
    }),
  };

  const global: DemoCatalogCluster[] = globalClusters.map((cl) => ({
    source: "global" as const,
    code: cl.code,
    nameKo: cl.nameKo,
    description: cl.description,
    competencies: cl.competencies.map((c) => {
      const rubricByLevel: RubricByLevel = {};
      for (const lv of c.rubricLevels) {
        const lines = lv.descriptionKo
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
        rubricByLevel[String(lv.level)] = lines.length > 0 ? lines : [lv.descriptionKo];
      }
      return {
        source: "global" as const,
        code: c.code,
        nameKo: c.nameKo,
        description: c.definition,
        clusterCode: cl.code,
        clusterNameKo: cl.nameKo,
        questionCount: c.questions.length,
        rubricByLevel,
        questions: c.questions.map((q, i) => {
          // Prefer level encoded in externalId (GLOB-CODE-L3-01); else round-robin L1–L5
          const m = /(?:^|-)L([1-5])(?:-|$)/i.exec(q.externalId);
          const level = m
            ? Number(m[1])
            : (((i % 5) + 1) as 1 | 2 | 3 | 4 | 5);
          return {
            externalId: q.externalId,
            level,
            template: q.questionText,
            sortOrder: q.sortOrder || i,
            rubricCriteria: rubricByLevel[String(level)] ?? [],
          };
        }),
      };
    }),
  }));

  return {
    clusters: [ncsCluster, ...global],
    totals: {
      ncs: ncsCluster.competencies.length,
      global: global.reduce((n, cl) => n + cl.competencies.length, 0),
    },
  };
}

function uniqueExternalId(workspaceId: string, preferred: string, used: Set<string>) {
  let id = preferred.startsWith("DEMO-") ? preferred : `DEMO-${preferred}`;
  if (!used.has(id)) {
    used.add(id);
    return id;
  }
  let n = 2;
  while (used.has(`${id}-${n}`)) n += 1;
  const next = `${id}-${n}`;
  used.add(next);
  return next;
}

/** 카탈로그에서 선택한 역량을 데모 키트에 추가 (문항·루브릭 포함) */
export async function addCatalogCompetenciesToDemo(
  workspaceId: string,
  selections: Array<{ source: DemoCatalogSource; code: string }>,
) {
  if (selections.length === 0) {
    throw new Error("추가할 역량을 선택해 주세요.");
  }

  const catalog = await loadDemoCatalogMetadata();
  const byKey = new Map<string, DemoCatalogCompetency>();
  for (const cl of catalog.clusters) {
    for (const c of cl.competencies) {
      byKey.set(`${c.source}:${c.code}`, c);
    }
  }

  const existing = await prisma.demoCompetency.findMany({
    where: { workspaceId },
    select: { code: true, sortOrder: true },
  });
  const existingCodes = new Set(existing.map((c) => c.code));
  let sortOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;

  const existingQs = await prisma.demoQuestion.findMany({
    where: { workspaceId },
    select: { externalId: true },
  });
  const usedExt = new Set(existingQs.map((q) => q.externalId));

  const added: string[] = [];
  const skipped: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const sel of selections) {
      const item = byKey.get(`${sel.source}:${sel.code}`);
      if (!item) {
        skipped.push(sel.code);
        continue;
      }
      if (existingCodes.has(item.code)) {
        skipped.push(item.code);
        continue;
      }

      const created = await tx.demoCompetency.create({
        data: {
          workspaceId,
          code: item.code,
          nameKo: item.nameKo,
          description: item.description,
          sortOrder,
          isActive: true,
          rubricByLevel: item.rubricByLevel as Prisma.InputJsonValue,
        },
      });
      sortOrder += 1;
      existingCodes.add(item.code);
      added.push(item.code);

      if (item.questions.length === 0) continue;

      await tx.demoQuestion.createMany({
        data: item.questions.map((q) => ({
          workspaceId,
          competencyId: created.id,
          externalId: uniqueExternalId(workspaceId, q.externalId, usedExt),
          level: Math.min(5, Math.max(1, q.level || 3)),
          template: q.template,
          sortOrder: q.sortOrder,
          isActive: true,
          rubricCriteria: q.rubricCriteria as Prisma.InputJsonValue,
        })),
      });
    }
  });

  return { added, skipped };
}

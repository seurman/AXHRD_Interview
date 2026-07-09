import { prisma } from "@/lib/prisma";
import { parseRubricByLevel, type RubricByLevel } from "@/lib/competency/rubric";
import { parseRubricCriteria } from "@/lib/competency/bank";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";
import { loadDemoWorkspaceSnapshot } from "@/lib/demo/workspace";
import { Prisma } from "@prisma/client";

const CATALOG_CACHE_TTL_MS = 60_000;
let catalogCache: {
  at: number;
  data: Awaited<ReturnType<typeof loadDemoCatalogMetadataUncached>>;
} | null = null;

export type DemoCatalogSource = "ncs" | "global" | "custom";

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

function sourceToCatalogSource(source: string): DemoCatalogSource {
  if (source === "NCS") return "ncs";
  if (source === "GLOBAL") return "global";
  return "custom";
}

/** 통합 역량 풀 — 클러스터별 메타데이터 팔레트 */
export async function loadDemoCatalogMetadata(): Promise<{
  clusters: DemoCatalogCluster[];
  totals: { ncs: number; global: number; custom: number };
}> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_CACHE_TTL_MS) {
    return catalogCache.data;
  }
  const data = await loadDemoCatalogMetadataUncached();
  catalogCache = { at: now, data };
  return data;
}

async function loadDemoCatalogMetadataUncached(): Promise<{
  clusters: DemoCatalogCluster[];
  totals: { ncs: number; global: number; custom: number };
}> {
  const bank = await loadContentBankSnapshot();
  const qsByComp = new Map<string, typeof bank.questions>();
  for (const q of bank.questions) {
    if (!q.isActive) continue;
    const list = qsByComp.get(q.competencyId) ?? [];
    list.push(q);
    qsByComp.set(q.competencyId, list);
  }

  const compsByCluster = new Map<string, typeof bank.competencies>();
  for (const c of bank.competencies) {
    if (!c.isActive) continue;
    const key = c.clusterId ?? "__unclustered__";
    const list = compsByCluster.get(key) ?? [];
    list.push(c);
    compsByCluster.set(key, list);
  }

  const clusters: DemoCatalogCluster[] = bank.clusters
    .filter((cl) => cl.isActive)
    .map((cl) => {
      const comps = compsByCluster.get(cl.id) ?? [];
      const catalogSource = sourceToCatalogSource(cl.source);
      return {
        source: catalogSource,
        code: cl.code,
        nameKo: cl.nameKo,
        description: cl.description,
        competencies: comps.map((c) => {
          const qs = qsByComp.get(c.id) ?? [];
          const rubricByLevel = parseRubricByLevel(c.rubricByLevel);
          return {
            source: sourceToCatalogSource(c.source),
            code: c.code,
            nameKo: c.nameKo,
            description: c.description,
            clusterCode: cl.code,
            clusterNameKo: cl.nameKo,
            questionCount: qs.length,
            rubricByLevel,
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
    });

  const unclustered = compsByCluster.get("__unclustered__") ?? [];
  if (unclustered.length > 0) {
    clusters.push({
      source: "custom",
      code: "UNCATEGORIZED",
      nameKo: "미분류 역량",
      description: null,
      competencies: unclustered.map((c) => {
        const qs = qsByComp.get(c.id) ?? [];
        return {
          source: sourceToCatalogSource(c.source),
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
    });
  }

  let ncs = 0;
  let global = 0;
  let custom = 0;
  for (const cl of clusters) {
    const n = cl.competencies.length;
    if (cl.source === "ncs") ncs += n;
    else if (cl.source === "global") global += n;
    else custom += n;
  }

  return { clusters, totals: { ncs, global, custom } };
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

  if (added.length === 0) {
    return { added, skipped, competencies: [], questions: [] };
  }

  const snap = await loadDemoWorkspaceSnapshot(workspaceId);
  const addedSet = new Set(added);
  return {
    added,
    skipped,
    competencies: snap?.competencies.filter((c) => addedSet.has(c.code)) ?? [],
    questions: snap?.questions.filter((q) => addedSet.has(q.competencyCode)) ?? [],
  };
}

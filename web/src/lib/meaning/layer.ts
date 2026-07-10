import { prisma } from "@/lib/prisma";
import type { ConceptEdgeType, ConceptNodeKind, Prisma } from "@prisma/client";

export const MEANING_EDGE_LABELS: Record<ConceptEdgeType, string> = {
  MEMBER_OF: "소속",
  HAS_LEVEL: "레벨",
  PROBES: "측정",
  ALIGNS_WITH: "벤치마크 정렬",
  MAPS_TO: "NCS↔Global 매핑",
  CONTEXTUALIZES: "맥락",
  SIGNALS: "신호",
  SUPPORTED_BY: "근거",
};

export const MEANING_KIND_LABELS: Record<ConceptNodeKind, string> = {
  NCS_COMPETENCY: "NCS 역량",
  GLOBAL_CLUSTER: "글로벌 역량군",
  GLOBAL_COMPETENCY: "글로벌 역량",
  GLOBAL_RUBRIC_LEVEL: "글로벌 루브릭 레벨",
  IRT_QUESTION: "IRT 문항",
  GLOBAL_QUESTION: "글로벌 문항",
  BENCHMARK_REF: "벤치마크",
  ROLE_CONTEXT: "직무·맥락",
};

export type MeaningNeighbor = {
  direction: "out" | "in";
  edgeType: ConceptEdgeType;
  edgeLabel: string;
  weight: number;
  note: string | null;
  otherKind: ConceptNodeKind;
  otherKey: string;
  otherLabel: string;
  relationId: string;
};

async function resolveNodeLabel(kind: ConceptNodeKind, key: string): Promise<string> {
  switch (kind) {
    case "NCS_COMPETENCY": {
      const c = await prisma.competency.findFirst({
        where: { code: key, ownerScope: "PLATFORM", organizationId: null },
        select: { nameKo: true },
      });
      return c?.nameKo ?? key;
    }
    case "GLOBAL_COMPETENCY": {
      const c = await prisma.globalCompetency.findUnique({
        where: { code: key },
        select: { nameKo: true },
      });
      return c?.nameKo ?? key;
    }
    case "GLOBAL_CLUSTER": {
      const c = await prisma.globalCompetencyCluster.findUnique({
        where: { code: key },
        select: { nameKo: true },
      });
      return c?.nameKo ?? key;
    }
    case "IRT_QUESTION":
    case "GLOBAL_QUESTION":
      return key;
    case "BENCHMARK_REF":
      return key.includes("::") ? key.split("::").slice(1).join("::") : key;
    case "GLOBAL_RUBRIC_LEVEL":
      return key;
    case "ROLE_CONTEXT":
      return key;
    default:
      return key;
  }
}

export async function loadMeaningLayerSnapshot() {
  const [relations, ncs, clusters, edgeCounts] = await Promise.all([
    prisma.conceptRelation.findMany({
      where: { isActive: true },
      orderBy: [{ edgeType: "asc" }, { fromKey: "asc" }, { weight: "desc" }],
    }),
    prisma.competency.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, code: true, nameKo: true },
    }),
    prisma.globalCompetencyCluster.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        competencies: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, nameKo: true },
        },
      },
    }),
    prisma.conceptRelation.groupBy({
      by: ["edgeType"],
      where: { isActive: true },
      _count: { _all: true },
    }),
  ]);

  const mapsTo = relations.filter((r) => r.edgeType === "MAPS_TO");
  const ncsLabel = new Map(ncs.map((c) => [c.code, c.nameKo]));
  const globalLabel = new Map(
    clusters.flatMap((cl) => cl.competencies.map((c) => [c.code, c.nameKo] as const)),
  );

  return {
    stats: {
      totalEdges: relations.length,
      byEdgeType: Object.fromEntries(
        edgeCounts.map((e) => [e.edgeType, e._count._all]),
      ) as Partial<Record<ConceptEdgeType, number>>,
    },
    ncsCompetencies: ncs,
    globalClusters: clusters.map((cl) => ({
      id: cl.id,
      code: cl.code,
      nameKo: cl.nameKo,
      competencies: cl.competencies,
    })),
    mapsTo: mapsTo.map((r) => ({
      id: r.id,
      fromKey: r.fromKey,
      fromLabel: ncsLabel.get(r.fromKey) ?? r.fromKey,
      toKey: r.toKey,
      toLabel: globalLabel.get(r.toKey) ?? r.toKey,
      weight: r.weight,
      note: r.note,
    })),
    edgeTypeLabels: MEANING_EDGE_LABELS,
    kindLabels: MEANING_KIND_LABELS,
  };
}

export async function loadConceptNeighborhood(
  kind: ConceptNodeKind,
  key: string,
): Promise<{
  kind: ConceptNodeKind;
  key: string;
  label: string;
  neighbors: MeaningNeighbor[];
}> {
  const [out, inn, label] = await Promise.all([
    prisma.conceptRelation.findMany({
      where: { isActive: true, fromKind: kind, fromKey: key },
      orderBy: [{ edgeType: "asc" }, { weight: "desc" }],
    }),
    prisma.conceptRelation.findMany({
      where: { isActive: true, toKind: kind, toKey: key },
      orderBy: [{ edgeType: "asc" }, { weight: "desc" }],
    }),
    resolveNodeLabel(kind, key),
  ]);

  const neighbors: MeaningNeighbor[] = [];

  for (const r of out) {
    neighbors.push({
      direction: "out",
      edgeType: r.edgeType,
      edgeLabel: MEANING_EDGE_LABELS[r.edgeType],
      weight: r.weight,
      note: r.note,
      otherKind: r.toKind,
      otherKey: r.toKey,
      otherLabel: await resolveNodeLabel(r.toKind, r.toKey),
      relationId: r.id,
    });
  }
  for (const r of inn) {
    neighbors.push({
      direction: "in",
      edgeType: r.edgeType,
      edgeLabel: MEANING_EDGE_LABELS[r.edgeType],
      weight: r.weight,
      note: r.note,
      otherKind: r.fromKind,
      otherKey: r.fromKey,
      otherLabel: await resolveNodeLabel(r.fromKind, r.fromKey),
      relationId: r.id,
    });
  }

  return { kind, key, label, neighbors };
}

export async function upsertConceptRelation(input: {
  edgeType: ConceptEdgeType;
  fromKind: ConceptNodeKind;
  fromKey: string;
  fromId?: string | null;
  toKind: ConceptNodeKind;
  toKey: string;
  toId?: string | null;
  weight?: number;
  note?: string | null;
  source?: string;
  meta?: Prisma.InputJsonValue;
}) {
  return prisma.conceptRelation.upsert({
    where: {
      edgeType_fromKind_fromKey_toKind_toKey: {
        edgeType: input.edgeType,
        fromKind: input.fromKind,
        fromKey: input.fromKey,
        toKind: input.toKind,
        toKey: input.toKey,
      },
    },
    create: {
      edgeType: input.edgeType,
      fromKind: input.fromKind,
      fromKey: input.fromKey,
      fromId: input.fromId ?? null,
      toKind: input.toKind,
      toKey: input.toKey,
      toId: input.toId ?? null,
      weight: input.weight ?? 1,
      note: input.note ?? null,
      source: input.source ?? "admin",
      meta: input.meta ?? {},
    },
    update: {
      fromId: input.fromId ?? undefined,
      toId: input.toId ?? undefined,
      weight: input.weight ?? 1,
      note: input.note ?? null,
      isActive: true,
      source: input.source ?? "admin",
      meta: input.meta ?? {},
    },
  });
}

/**
 * Meaning Layer seed — MAPS_TO (NCS ↔ Global) + structural edges from Global dictionary.
 * Idempotent upserts on ConceptRelation unique key.
 */
import { PrismaClient, type ConceptEdgeType, type ConceptNodeKind } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type MapsFile = {
  version: number;
  edgeType: ConceptEdgeType;
  fromKind: ConceptNodeKind;
  toKind: ConceptNodeKind;
  mappings: Array<{
    fromKey: string;
    targets: Array<{ toKey: string; weight?: number; note?: string }>;
  }>;
};

async function upsertEdge(data: {
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
  meta?: object;
}) {
  return prisma.conceptRelation.upsert({
    where: {
      edgeType_fromKind_fromKey_toKind_toKey: {
        edgeType: data.edgeType,
        fromKind: data.fromKind,
        fromKey: data.fromKey,
        toKind: data.toKind,
        toKey: data.toKey,
      },
    },
    create: {
      edgeType: data.edgeType,
      fromKind: data.fromKind,
      fromKey: data.fromKey,
      fromId: data.fromId ?? null,
      toKind: data.toKind,
      toKey: data.toKey,
      toId: data.toId ?? null,
      weight: data.weight ?? 1,
      note: data.note ?? null,
      source: data.source ?? "seed",
      meta: data.meta ?? {},
    },
    update: {
      fromId: data.fromId ?? null,
      toId: data.toId ?? null,
      weight: data.weight ?? 1,
      note: data.note ?? null,
      isActive: true,
      source: data.source ?? "seed",
      meta: data.meta ?? {},
    },
  });
}

async function seedMapsTo() {
  const path = join(__dirname, "../../seed/meaning-maps-to.json");
  const file = JSON.parse(readFileSync(path, "utf-8")) as MapsFile;

  const ncs = await prisma.competency.findMany({ select: { id: true, code: true } });
  const global = await prisma.globalCompetency.findMany({ select: { id: true, code: true } });
  const ncsByCode = new Map(ncs.map((c) => [c.code, c.id]));
  const globalByCode = new Map(global.map((c) => [c.code, c.id]));

  let count = 0;
  for (const mapping of file.mappings) {
    const fromId = ncsByCode.get(mapping.fromKey) ?? null;
    for (const t of mapping.targets) {
      const toId = globalByCode.get(t.toKey) ?? null;
      await upsertEdge({
        edgeType: file.edgeType,
        fromKind: file.fromKind,
        fromKey: mapping.fromKey,
        fromId,
        toKind: file.toKind,
        toKey: t.toKey,
        toId,
        weight: t.weight ?? 1,
        note: t.note ?? null,
        source: "seed",
      });
      count += 1;
    }
  }
  return count;
}

async function seedRoleContext() {
  const path = join(__dirname, "../../seed/meaning-role-context.json");
  const file = JSON.parse(readFileSync(path, "utf-8")) as MapsFile;

  const ncs = await prisma.competency.findMany({ select: { id: true, code: true } });
  const ncsByCode = new Map(ncs.map((c) => [c.code, c.id]));

  let count = 0;
  for (const mapping of file.mappings) {
    for (const t of mapping.targets) {
      const toId = ncsByCode.get(t.toKey) ?? null;
      await upsertEdge({
        edgeType: file.edgeType,
        fromKind: file.fromKind,
        fromKey: mapping.fromKey,
        toKind: file.toKind,
        toKey: t.toKey,
        toId,
        weight: t.weight ?? 1,
        note: t.note ?? null,
        source: "seed",
      });
      count += 1;
    }
  }
  return count;
}

async function seedStructuralFromGlobal() {
  const clusters = await prisma.globalCompetencyCluster.findMany({
    include: {
      competencies: {
        include: {
          rubricLevels: true,
          questions: true,
          benchmarks: true,
        },
      },
    },
  });

  let memberOf = 0;
  let hasLevel = 0;
  let probes = 0;
  let aligns = 0;

  for (const cluster of clusters) {
    for (const comp of cluster.competencies) {
      await upsertEdge({
        edgeType: "MEMBER_OF",
        fromKind: "GLOBAL_COMPETENCY",
        fromKey: comp.code,
        fromId: comp.id,
        toKind: "GLOBAL_CLUSTER",
        toKey: cluster.code,
        toId: cluster.id,
        note: "global dictionary membership",
      });
      memberOf += 1;

      for (const level of comp.rubricLevels) {
        const levelKey = `${comp.code}:L${level.level}`;
        await upsertEdge({
          edgeType: "HAS_LEVEL",
          fromKind: "GLOBAL_COMPETENCY",
          fromKey: comp.code,
          fromId: comp.id,
          toKind: "GLOBAL_RUBRIC_LEVEL",
          toKey: levelKey,
          toId: level.id,
          meta: { level: level.level },
        });
        hasLevel += 1;
      }

      for (const q of comp.questions) {
        await upsertEdge({
          edgeType: "PROBES",
          fromKind: "GLOBAL_QUESTION",
          fromKey: q.externalId,
          fromId: q.id,
          toKind: "GLOBAL_COMPETENCY",
          toKey: comp.code,
          toId: comp.id,
        });
        probes += 1;
      }

      for (const b of comp.benchmarks) {
        const benchKey = `${b.frameworkName}::${b.refLabel}`;
        await upsertEdge({
          edgeType: "ALIGNS_WITH",
          fromKind: "GLOBAL_COMPETENCY",
          fromKey: comp.code,
          fromId: comp.id,
          toKind: "BENCHMARK_REF",
          toKey: benchKey,
          toId: b.id,
          note: b.refLabel,
          meta: { sourceUrl: b.sourceUrl, frameworkName: b.frameworkName },
        });
        aligns += 1;
      }
    }
  }

  return { memberOf, hasLevel, probes, aligns };
}

async function seedProbesFromIrt() {
  const questions = await prisma.question.findMany({
    select: {
      id: true,
      externalId: true,
      level: true,
      competency: { select: { id: true, code: true } },
    },
  });

  let probes = 0;
  for (const q of questions) {
    await upsertEdge({
      edgeType: "PROBES",
      fromKind: "IRT_QUESTION",
      fromKey: q.externalId,
      fromId: q.id,
      toKind: "NCS_COMPETENCY",
      toKey: q.competency.code,
      toId: q.competency.id,
      meta: { level: q.level },
    });
    probes += 1;
  }
  return probes;
}

/** ARC DiagnosticSubscale → NCS Competency (SIGNALS) */
async function seedDiagnosticSignals() {
  const path = join(__dirname, "../../seed/meaning-diagnostic-signals.json");
  const file = JSON.parse(readFileSync(path, "utf-8")) as MapsFile;

  const ncs = await prisma.competency.findMany({
    where: { ownerScope: "PLATFORM", organizationId: null },
    select: { id: true, code: true },
  });
  const ncsByCode = new Map(ncs.map((c) => [c.code, c.id]));

  let count = 0;
  for (const mapping of file.mappings) {
    for (const t of mapping.targets) {
      const toId = ncsByCode.get(t.toKey) ?? null;
      await upsertEdge({
        edgeType: file.edgeType,
        fromKind: file.fromKind,
        fromKey: mapping.fromKey,
        toKind: file.toKind,
        toKey: t.toKey,
        toId,
        weight: t.weight ?? 1,
        note: t.note ?? null,
        source: "seed",
        meta: { domain: "diagnostic_gap_to_hire" },
      });
      count += 1;
    }
  }
  return count;
}

async function main() {
  console.log("Seeding Meaning Layer (ConceptRelation)…");

  const maps = await seedMapsTo();
  console.log(`  MAPS_TO edges: ${maps}`);

  const roleCtx = await seedRoleContext();
  console.log(`  CONTEXTUALIZES (role/keyword): ${roleCtx}`);

  const structural = await seedStructuralFromGlobal();
  console.log(
    `  MEMBER_OF: ${structural.memberOf}, HAS_LEVEL: ${structural.hasLevel}, GLOBAL PROBES: ${structural.probes}, ALIGNS_WITH: ${structural.aligns}`,
  );

  const irtProbes = await seedProbesFromIrt();
  console.log(`  IRT PROBES: ${irtProbes}`);

  const diagnosticSignals = await seedDiagnosticSignals();
  console.log(`  SIGNALS (DIAGNOSTIC_SUBSCALE→NCS): ${diagnosticSignals}`);

  const total = await prisma.conceptRelation.count();
  console.log(`Done. ConceptRelation total rows: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

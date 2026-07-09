import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  loadDemoCatalogMetadata,
  type DemoCatalogSource,
} from "@/lib/demo/catalog";
import { loadContentBankSnapshot } from "@/lib/competency/content-bank-data";

function difficultyForLevel(level: number): number {
  const map: Record<number, number> = {
    1: -1.4,
    2: -0.6,
    3: 0,
    4: 0.7,
    5: 1.4,
  };
  return map[level] ?? 0;
}

function uniqueExternalId(preferred: string, used: Set<string>) {
  let id = preferred.trim();
  if (!id) id = `Q-${Date.now()}`;
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

/** 카탈로그(Global·NCS 메타)에서 운영 문항 뱅크로 역량·문항·루브릭 일괄 추가 */
export async function addCatalogCompetenciesToBank(
  selections: Array<{ source: DemoCatalogSource; code: string }>,
) {
  if (selections.length === 0) {
    throw new Error("추가할 역량을 선택해 주세요.");
  }

  const catalog = await loadDemoCatalogMetadata();
  const byKey = new Map<string, (typeof catalog.clusters)[0]["competencies"][0]>();
  for (const cl of catalog.clusters) {
    for (const c of cl.competencies) {
      byKey.set(`${c.source}:${c.code}`, c);
    }
  }

  const existing = await prisma.competency.findMany({
    select: { code: true, sortOrder: true },
  });
  const existingCodes = new Set(existing.map((c) => c.code));
  let sortOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;

  const existingQs = await prisma.question.findMany({ select: { externalId: true } });
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

      const created = await tx.competency.create({
        data: {
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

      await tx.question.createMany({
        data: item.questions.map((q) => {
          const level = Math.min(5, Math.max(1, q.level || 3));
          return {
            competencyId: created.id,
            externalId: uniqueExternalId(q.externalId, usedExt),
            level,
            template: q.template,
            sortOrder: q.sortOrder,
            isActive: true,
            rubricCriteria: q.rubricCriteria as Prisma.InputJsonValue,
            difficulty: difficultyForLevel(level),
            discrimination: 1,
            followUpHints: [] as unknown as import("@prisma/client").Prisma.InputJsonValue,
          };
        }),
      });
    }
  });

  if (added.length === 0) {
    return { added, skipped, competencies: [], questions: [] };
  }

  const snap = await loadContentBankSnapshot();
  const addedSet = new Set(added);
  return {
    added,
    skipped,
    competencies: snap.competencies.filter((c) => addedSet.has(c.code)),
    questions: snap.questions.filter((q) => addedSet.has(q.competencyCode)),
  };
}

import type { PrismaClient } from "@prisma/client";
import { ARC_INDEX_SEED, type SeedItem, type SeedSection, type SeedSubscale } from "../../../prisma/seed/arc-index-data";

export type InstrumentSyncResult = {
  instrumentId: string;
  created: boolean;
  version: string;
  versionBumped: boolean;
  stats: {
    sections: { created: number; updated: number };
    subscales: { created: number; updated: number };
    items: { created: number; updated: number; deleted: number };
  };
};

function itemData(sectionId: string, subscaleId: string | null, item: SeedItem) {
  return {
    sectionId,
    subscaleId,
    itemCode: item.itemCode,
    textKo: item.textKo,
    scaleType: item.scaleType,
    hasImportanceAxis: item.hasImportanceAxis ?? false,
    isReversed: item.isReversed ?? false,
    isDemographic: item.isDemographic ?? false,
    choiceOptions: item.choiceOptions ?? undefined,
    order: item.order,
  };
}

function itemChanged(
  existing: {
    textKo: string;
    scaleType: string;
    hasImportanceAxis: boolean;
    isReversed: boolean;
    isDemographic: boolean;
    order: number;
    subscaleId: string | null;
    choiceOptions: unknown;
  },
  item: SeedItem,
  subscaleId: string | null,
): boolean {
  const seedChoices = item.choiceOptions ?? null;
  const existingChoices = existing.choiceOptions ?? null;
  const choicesChanged =
    JSON.stringify(existingChoices) !== JSON.stringify(seedChoices);
  return (
    existing.textKo !== item.textKo ||
    existing.scaleType !== item.scaleType ||
    existing.hasImportanceAxis !== (item.hasImportanceAxis ?? false) ||
    existing.isReversed !== (item.isReversed ?? false) ||
    existing.isDemographic !== (item.isDemographic ?? false) ||
    existing.order !== item.order ||
    existing.subscaleId !== subscaleId ||
    choicesChanged
  );
}

async function upsertItemsForSection(
  prisma: PrismaClient,
  sectionId: string,
  section: SeedSection,
  subscaleIdByCode: Map<string, string>,
  stats: InstrumentSyncResult["stats"],
): Promise<boolean> {
  let changed = false;

  const existingItems = await prisma.diagnosticItem.findMany({
    where: { sectionId },
    select: {
      id: true,
      itemCode: true,
      textKo: true,
      scaleType: true,
      hasImportanceAxis: true,
      isReversed: true,
      isDemographic: true,
      order: true,
      subscaleId: true,
      choiceOptions: true,
    },
  });
  const byCode = new Map(existingItems.map((i) => [i.itemCode, i]));

  const seedItems: Array<{ item: SeedItem; subscaleId: string | null }> = [];
  for (const raw of section.directItems ?? []) {
    seedItems.push({ item: raw as SeedItem, subscaleId: null });
  }
  for (const rawSub of section.subscales) {
    const sub = rawSub as SeedSubscale;
    const subscaleId = subscaleIdByCode.get(sub.code) ?? null;
    for (const raw of sub.items) {
      seedItems.push({ item: raw as SeedItem, subscaleId });
    }
  }

  for (const { item, subscaleId } of seedItems) {
    const existing = byCode.get(item.itemCode);
    if (!existing) {
      await prisma.diagnosticItem.create({ data: itemData(sectionId, subscaleId, item) });
      stats.items.created += 1;
      changed = true;
      continue;
    }
    if (itemChanged(existing, item, subscaleId)) {
      await prisma.diagnosticItem.update({
        where: { id: existing.id },
        data: itemData(sectionId, subscaleId, item),
      });
      stats.items.updated += 1;
      changed = true;
    }
    byCode.delete(item.itemCode);
  }

  // Remove items no longer in seed (answers first — FK has no Cascade)
  for (const orphan of byCode.values()) {
    await prisma.diagnosticAnswer.deleteMany({ where: { itemId: orphan.id } });
    await prisma.diagnosticItem.delete({ where: { id: orphan.id } });
    stats.items.deleted += 1;
    changed = true;
  }

  return changed;
}

/** docs/arc-index/source 정본 → arc-index-data.ts → DB idempotent 동기화 */
export async function syncArcIndexFromSeed(prisma: PrismaClient): Promise<InstrumentSyncResult> {
  const stats = {
    sections: { created: 0, updated: 0 },
    subscales: { created: 0, updated: 0 },
    items: { created: 0, updated: 0, deleted: 0 },
  };

  const seed = ARC_INDEX_SEED;
  let changed = false;

  let instrument = await prisma.diagnosticInstrument.findUnique({
    where: { code: seed.instrument.code },
  });

  const instrumentCreated = !instrument;

  if (!instrument) {
    instrument = await prisma.diagnosticInstrument.create({
      data: {
        code: seed.instrument.code,
        nameKo: seed.instrument.nameKo,
        version: seed.instrument.version,
        estimatedMinutes: seed.instrument.estimatedMinutes,
        minGroupSize: 5,
      },
    });
    changed = true;
  } else {
    const metaChanged =
      instrument.nameKo !== seed.instrument.nameKo ||
      instrument.estimatedMinutes !== seed.instrument.estimatedMinutes;
    if (metaChanged) {
      await prisma.diagnosticInstrument.update({
        where: { id: instrument.id },
        data: {
          nameKo: seed.instrument.nameKo,
          estimatedMinutes: seed.instrument.estimatedMinutes,
        },
      });
      changed = true;
    }
  }

  const created = !instrument.createdAt || stats.sections.created > 0;

  for (const rawSection of seed.sections) {
    const section = rawSection as SeedSection;
    let sec = await prisma.diagnosticSection.findUnique({
      where: { instrumentId_code: { instrumentId: instrument.id, code: section.code } },
    });
    if (!sec) {
      sec = await prisma.diagnosticSection.create({
        data: {
          instrumentId: instrument.id,
          code: section.code,
          nameKo: section.nameKo,
          order: section.order,
        },
      });
      stats.sections.created += 1;
      changed = true;
    } else if (sec.nameKo !== section.nameKo || sec.order !== section.order) {
      await prisma.diagnosticSection.update({
        where: { id: sec.id },
        data: { nameKo: section.nameKo, order: section.order },
      });
      stats.sections.updated += 1;
      changed = true;
    }

    const subscaleIdByCode = new Map<string, string>();
    for (const rawSub of section.subscales) {
      const sub = rawSub as SeedSubscale;
      let subscale = await prisma.diagnosticSubscale.findUnique({
        where: { sectionId_code: { sectionId: sec.id, code: sub.code } },
      });
      if (!subscale) {
        subscale = await prisma.diagnosticSubscale.create({
          data: {
            sectionId: sec.id,
            code: sub.code,
            nameKo: sub.nameKo,
            weight: sub.weight ?? null,
            isDriver: sub.isDriver ?? false,
            order: sub.order,
          },
        });
        stats.subscales.created += 1;
        changed = true;
      } else {
        const subChanged =
          subscale.nameKo !== sub.nameKo ||
          subscale.order !== sub.order ||
          subscale.weight !== (sub.weight ?? null) ||
          subscale.isDriver !== (sub.isDriver ?? false);
        if (subChanged) {
          await prisma.diagnosticSubscale.update({
            where: { id: subscale.id },
            data: {
              nameKo: sub.nameKo,
              order: sub.order,
              weight: sub.weight ?? null,
              isDriver: sub.isDriver ?? false,
            },
          });
          stats.subscales.updated += 1;
          changed = true;
        }
      }
      subscaleIdByCode.set(sub.code, subscale.id);
    }

    const itemsChanged = await upsertItemsForSection(
      prisma,
      sec.id,
      section,
      subscaleIdByCode,
      stats,
    );
    if (itemsChanged) changed = true;
  }

  let version = instrument.version;
  let versionBumped = false;
  if (changed || instrument.version !== seed.instrument.version) {
    version = seed.instrument.version;
    versionBumped = version !== instrument.version;
    await prisma.diagnosticInstrument.update({
      where: { id: instrument.id },
      data: {
        version,
        nameKo: seed.instrument.nameKo,
        estimatedMinutes: seed.instrument.estimatedMinutes,
      },
    });
  }

  await ensureDefaultReportProfile(prisma, instrument.id);

  return {
    instrumentId: instrument.id,
    created: instrumentCreated,
    version,
    versionBumped,
    stats,
  };
}

async function ensureDefaultReportProfile(prisma: PrismaClient, instrumentId: string) {
  const existing = await prisma.diagnosticReportProfile.findFirst({
    where: { instrumentId, isInstrumentDefault: true },
  });
  if (existing) return existing;

  return prisma.diagnosticReportProfile.create({
    data: {
      instrumentId,
      name: "ARC Index 표준",
      isInstrumentDefault: true,
      presetCode: "arc_standard",
      activeTabs: ["summary", "ohi", "ori", "ovi", "oai", "prescription"],
      activeSectionCodes: ["OHI", "ORI", "OVI", "OAI"],
      showNarratives: true,
      showGapMatrix: true,
    },
  });
}

export async function seedArcIndex(prisma: PrismaClient) {
  const result = await syncArcIndexFromSeed(prisma);
  return result.instrumentId;
}

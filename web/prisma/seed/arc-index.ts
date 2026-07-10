import { PrismaClient } from "@prisma/client";
import { ARC_INDEX_SEED, type SeedItem, type SeedSubscale } from "./arc-index-data";

export async function seedArcIndex(prisma: PrismaClient) {
  const existing = await prisma.diagnosticInstrument.findUnique({
    where: { code: ARC_INDEX_SEED.instrument.code },
  });
  if (existing) {
    console.log("[arc-index] ARC_INDEX already seeded — skip");
    return existing.id;
  }

  const instrument = await prisma.diagnosticInstrument.create({
    data: {
      code: ARC_INDEX_SEED.instrument.code,
      nameKo: ARC_INDEX_SEED.instrument.nameKo,
      version: ARC_INDEX_SEED.instrument.version,
      estimatedMinutes: ARC_INDEX_SEED.instrument.estimatedMinutes,
      minGroupSize: 5,
    },
  });

  for (const section of ARC_INDEX_SEED.sections) {
    const sec = await prisma.diagnosticSection.create({
      data: {
        instrumentId: instrument.id,
        code: section.code,
        nameKo: section.nameKo,
        order: section.order,
      },
    });

    if (section.directItems?.length) {
      for (const raw of section.directItems) {
        const item = raw as SeedItem;
        await prisma.diagnosticItem.create({
          data: {
            sectionId: sec.id,
            itemCode: item.itemCode,
            textKo: item.textKo,
            scaleType: item.scaleType,
            hasImportanceAxis: item.hasImportanceAxis ?? false,
            isReversed: item.isReversed ?? false,
            isDemographic: item.isDemographic ?? false,
            choiceOptions: item.choiceOptions ?? undefined,
            order: item.order,
          },
        });
      }
    }

    for (const rawSub of section.subscales) {
      const sub = rawSub as SeedSubscale;
      const subscale = await prisma.diagnosticSubscale.create({
        data: {
          sectionId: sec.id,
          code: sub.code,
          nameKo: sub.nameKo,
          weight: sub.weight ?? null,
          isDriver: sub.isDriver ?? false,
          order: sub.order,
        },
      });

      for (const raw of sub.items) {
        const item = raw as SeedItem;
        await prisma.diagnosticItem.create({
          data: {
            sectionId: sec.id,
            subscaleId: subscale.id,
            itemCode: item.itemCode,
            textKo: item.textKo,
            scaleType: item.scaleType,
            hasImportanceAxis: item.hasImportanceAxis ?? false,
            isReversed: item.isReversed ?? false,
            isDemographic: item.isDemographic ?? false,
            choiceOptions: item.choiceOptions ?? undefined,
            order: item.order,
          },
        });
      }
    }
  }

  console.log("[arc-index] Seeded ARC_INDEX instrument");
  return instrument.id;
}

if (require.main === module) {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  seedArcIndex(prisma)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

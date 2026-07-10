/**
 * rubricByLevel JSON → 플랫폼 기본 RubricSet 백필 + 문항 일괄 매핑
 *
 * Usage: cd web && npx tsx scripts/backfill-rubric-sets.ts
 */
import { prisma } from "../src/lib/prisma";
import {
  importLegacyRubricSet,
  bulkMapQuestionsToDefaultRubric,
} from "../src/lib/repository/service";
import { PLATFORM_OWNER_FILTER } from "../src/lib/content/ownership";
import { legacyRubricLevels } from "../src/lib/repository/coverage";

async function main() {
  const competencies = await prisma.competency.findMany({
    where: PLATFORM_OWNER_FILTER,
    select: { id: true, code: true, nameKo: true, rubricByLevel: true },
  });

  let setsCreated = 0;
  let questionsMapped = 0;
  let skipped = 0;

  for (const comp of competencies) {
    const levels = legacyRubricLevels(comp.rubricByLevel);
    if (levels.length === 0) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.rubricSet.findFirst({
      where: { competencyId: comp.id, organizationId: null, isDefault: true },
    });

    if (!existing) {
      const result = await importLegacyRubricSet(comp.id);
      if (!result.ok) {
        console.warn(`[skip] ${comp.code}: ${result.error}`);
        skipped += 1;
        continue;
      }
      setsCreated += 1;
      console.log(`[set] ${comp.code} — ${comp.nameKo}`);
    }

    const mapResult = await bulkMapQuestionsToDefaultRubric(comp.id);
    if (mapResult.ok && mapResult.mappedCount > 0) {
      questionsMapped += mapResult.mappedCount;
      console.log(`  ↳ mapped ${mapResult.mappedCount} questions`);
    }
  }

  console.log(
    `\nDone. setsCreated=${setsCreated} questionsMapped=${questionsMapped} skipped=${skipped}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

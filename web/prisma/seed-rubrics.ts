/**
 * NCS 기반 역량·레벨별 루브릭 DB 시드
 * 출처: seed/ncs-rubrics.json (한국산업인력공단 NCS, KOGL 제1유형)
 */
import { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { normalizeImportLevels, parseRubricImportFile } from "../src/lib/competency/rubric";

const prisma = new PrismaClient();

async function main() {
  const seedPath = join(__dirname, "../../seed/ncs-rubrics.json");
  const raw = JSON.parse(readFileSync(seedPath, "utf-8"));
  const parsed = parseRubricImportFile(raw);
  if (!parsed?.competencies?.length) {
    throw new Error("ncs-rubrics.json 형식이 올바르지 않습니다.");
  }

  let updated = 0;
  for (const item of parsed.competencies) {
    const code = item.code?.trim()?.toUpperCase();
    if (!code || !item.levels) continue;

    const comp = await prisma.competency.findUnique({ where: { code } });
    if (!comp) {
      console.warn(`skip: competency not found — ${code}`);
      continue;
    }

    const rubricByLevel = normalizeImportLevels(item.levels);
    if (Object.keys(rubricByLevel).length === 0) continue;

    await prisma.competency.update({
      where: { id: comp.id },
      data: { rubricByLevel: rubricByLevel as Prisma.InputJsonValue },
    });
    updated++;
    console.log(`  ✓ ${code} — L${Object.keys(rubricByLevel).sort().join(", L")}`);
  }

  console.log(`\nNCS rubric seed completed: ${updated}/${parsed.competencies.length} competencies`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

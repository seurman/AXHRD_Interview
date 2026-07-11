/**
 * 고객 시연용 샘플 데이터 (코호트·기관 비교·ARC Index)
 * Usage: cd web && npm run db:seed:showcase
 */
import { PrismaClient } from "@prisma/client";
import { syncNcsCompetencyBank } from "../src/lib/competency/ncs-bank-sync";
import { seedShowcaseDemoData } from "../src/lib/platform/showcase-seed";

const prisma = new PrismaClient();

async function main() {
  const { seedArcIndex } = await import("../prisma/seed/arc-index");
  await seedArcIndex(prisma);
  await syncNcsCompetencyBank(prisma);

  const result = await seedShowcaseDemoData(prisma);
  console.log("Showcase demo seed complete:", JSON.stringify(result, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

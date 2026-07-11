/**
 * NCS 역량·문항·루브릭만 플랫폼 뱅크에 동기화
 * Usage: cd web && npm run db:seed:ncs
 */
import { PrismaClient } from "@prisma/client";
import { syncNcsCompetencyBank } from "../src/lib/competency/ncs-bank-sync";

const prisma = new PrismaClient();

async function main() {
  const result = await syncNcsCompetencyBank(prisma);
  console.log("NCS bank sync complete:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

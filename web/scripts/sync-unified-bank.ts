/**
 * 운영 DB에 글로벌 역량을 통합 IRT 풀로 동기화합니다.
 * Usage: cd web && npx tsx scripts/sync-unified-bank.ts
 */
import { PrismaClient } from "@prisma/client";
import { syncUnifiedCompetencyPool } from "../src/lib/competency/unified-bank-sync";

const prisma = new PrismaClient();

async function main() {
  const result = await syncUnifiedCompetencyPool();
  console.log("Unified competency pool sync complete:", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import { syncArcIndexFromSeed } from "../../src/lib/diagnostic/instrument-sync";

export async function seedArcIndex(prisma: PrismaClient) {
  const result = await syncArcIndexFromSeed(prisma);
  console.log(
    `[arc-index] Sync complete — version ${result.version}${result.versionBumped ? " (bumped)" : ""}`,
  );
  return result.instrumentId;
}

if (require.main === module) {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  seedArcIndex(prisma)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

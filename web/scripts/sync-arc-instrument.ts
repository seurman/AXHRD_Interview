#!/usr/bin/env tsx
/**
 * Sync ARC Index instrument seed → DB.
 * Usage: npx tsx scripts/sync-arc-instrument.ts
 */
import { PrismaClient } from "@prisma/client";
import { syncArcIndexFromSeed } from "../src/lib/diagnostic/instrument-sync";

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await syncArcIndexFromSeed(prisma);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

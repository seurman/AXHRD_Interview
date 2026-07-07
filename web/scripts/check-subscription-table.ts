import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.subscription.count();
    console.log("OK: Subscription table exists, count =", count);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error("FAIL:", err.code, err.message);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());

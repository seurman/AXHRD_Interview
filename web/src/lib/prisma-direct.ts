import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaDirect: PrismaClient | undefined;
};

function directDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  return process.env.DATABASE_URL!;
}

/** Supabase transaction pooler(6543) 회피 — 시드·대량 쓰기용 세션/직접 연결 */
export const prismaDirect =
  globalForPrisma.prismaDirect ??
  new PrismaClient({
    datasources: { db: { url: directDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaDirect = prismaDirect;

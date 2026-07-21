/**
 * 역량 학습 패스 레슨 카탈로그를 DB에 upsert
 * Usage: DATABASE_URL=... DIRECT_URL=... npx tsx prisma/seed-learning-path.ts
 */
import { syncLessonCatalog } from "../src/lib/learning/path";

async function main() {
  const result = await syncLessonCatalog({ force: true });
  console.log(
    `[seed-learning-path] upserted=${result.upserted} total=${result.total}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });

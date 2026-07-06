import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface SeedData {
  competencies: Array<{
    code: string;
    nameKo: string;
    description: string;
  }>;
  questions: Array<{
    externalId: string;
    competency: string;
    level: number;
    difficulty: number;
    discrimination: number;
    template: string;
    followUpHints?: string[];
  }>;
}

async function main() {
  const seedPath = join(__dirname, "../../seed/questions.json");
  const data: SeedData = JSON.parse(readFileSync(seedPath, "utf-8"));

  for (let i = 0; i < data.competencies.length; i++) {
    const comp = data.competencies[i];
    await prisma.competency.upsert({
      where: { code: comp.code },
      update: { nameKo: comp.nameKo, description: comp.description, sortOrder: i, isActive: true },
      create: { ...comp, sortOrder: i, isActive: true },
    });
  }

  const sortCounters: Record<string, number> = {};
  for (const q of data.questions) {
    const competency = await prisma.competency.findUnique({
      where: { code: q.competency },
    });
    if (!competency) continue;

    const sortKey = `${q.competency}-L${q.level}`;
    const sortOrder = sortCounters[sortKey] ?? 0;
    sortCounters[sortKey] = sortOrder + 1;

    await prisma.question.upsert({
      where: { externalId: q.externalId },
      update: {
        level: q.level,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        template: q.template,
        followUpHints: q.followUpHints ?? [],
        sortOrder,
      },
      create: {
        externalId: q.externalId,
        competencyId: competency.id,
        level: q.level,
        difficulty: q.difficulty,
        discrimination: q.discrimination,
        template: q.template,
        followUpHints: q.followUpHints ?? [],
        sortOrder,
      },
    });
  }

  // Demo user
  await prisma.user.upsert({
    where: { email: "demo@hr-in.local" },
    update: {},
    create: {
      email: "demo@hr-in.local",
      name: "데모 사용자",
      profile: {
        create: {
          careerYears: 2,
          education: "대학교 졸업",
          desiredJobRole: "MARKETING",
        },
      },
    },
  });

  console.log("Seed completed:", {
    competencies: data.competencies.length,
    questions: data.questions.length,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

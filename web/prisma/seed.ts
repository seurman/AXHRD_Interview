import { PrismaClient } from "@prisma/client";
import { syncNcsCompetencyBank } from "../src/lib/competency/ncs-bank-sync";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "demo@hr-in.local" } });

  const ncs = await syncNcsCompetencyBank(prisma);

  if (!user) {
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
  }

  const { seedArcIndex } = await import("./seed/arc-index");
  await seedArcIndex(prisma);

  console.log("Seed completed:", ncs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

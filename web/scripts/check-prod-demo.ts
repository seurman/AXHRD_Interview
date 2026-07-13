import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: "테크노바" } },
        { name: { contains: "쇼케이스" } },
        { joinCode: "ARC-DEMO-2026" },
      ],
    },
    select: {
      id: true,
      name: true,
      diagnosticEnabled: true,
      joinCode: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
    },
  });

  const waves = await prisma.diagnosticWave.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    select: {
      id: true,
      slug: true,
      waveNumber: true,
      label: true,
      status: true,
      organizationId: true,
      organization: { select: { name: true } },
      _count: {
        select: {
          responses: { where: { submittedAt: { not: null } } },
          teams: { where: { level: "TEAM" } },
        },
      },
    },
  });

  const instrumentCount = await prisma.diagnosticInstrument.count();

  const arcAdmin = await prisma.user.findUnique({
    where: { email: "arc-demo-admin@demo.axhrd.local" },
    select: {
      email: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        instrumentCount,
        orgs,
        arcDemoAdmin: arcAdmin,
        waves: waves.map((w) => ({
          ...w,
          responseCount: w._count.responses,
          teamCount: w._count.teams,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

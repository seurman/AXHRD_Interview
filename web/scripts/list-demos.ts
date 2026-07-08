import { prisma } from "../src/lib/prisma";

async function main() {
  const demos = await prisma.demoWorkspace.findMany({
    select: { slug: true, name: true, presenterKey: true },
  });
  console.log(JSON.stringify(demos, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

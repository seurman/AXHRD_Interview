import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      platformRole: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (users.length === 0) {
    console.log("등록된 사용자가 없습니다.");
    return;
  }

  console.log(`총 ${users.length}명 (최근 30명):\n`);
  for (const u of users) {
    console.log(`- ${u.email} | ${u.name} | platformRole=${u.platformRole}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

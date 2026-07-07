/**
 * 운영 DB에서 특정 이메일에 SUPERADMIN 또는 ADMIN 부여
 * 사용: npx tsx scripts/grant-platform-role.ts seurman@gmail.com ADMIN
 */
import { PrismaClient, PlatformRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const roleArg = (process.argv[3] ?? "ADMIN").toUpperCase();

  if (!email) {
    console.error("사용법: npx tsx scripts/grant-platform-role.ts <email> [ADMIN|SUPERADMIN|CONTENT_ADMIN]");
    process.exit(1);
  }

  let role = roleArg as PlatformRole;
  if (roleArg === "CONTENT_ADMIN") role = "ADMIN";

  if (!["SUPERADMIN", "ADMIN"].includes(role)) {
    console.error("역할은 SUPERADMIN 또는 ADMIN 이어야 합니다.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const all = await prisma.user.findMany({
      select: { email: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    const similar = all.filter(
      (u) => u.email.includes(email.split("@")[0]) || email.includes(u.email.split("@")[0])
    );

    console.error(`사용자를 찾을 수 없습니다: ${email}`);
    if (similar.length > 0) {
      console.error("\n비슷한 계정:");
      for (const u of similar) console.error(`  - ${u.email} (${u.name})`);
    }
    if (all.length > 0) {
      console.error("\n최근 등록 계정:");
      for (const u of all) console.error(`  - ${u.email} (${u.name})`);
    } else {
      console.error("\nDB에 사용자가 없습니다. 먼저 회원가입 또는 로그인 후 다시 시도하세요.");
    }
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { platformRole: role },
  });

  console.log(`✓ ${email} → platformRole=${role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

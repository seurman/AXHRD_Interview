/**
 * 운영 DB에서 플랫폼 내부 역할 부여
 * 사용: npx tsx scripts/grant-platform-role.ts user@example.com BUSINESS_ADMIN
 */
import { PrismaClient, type PlatformRole } from "@prisma/client";

const prisma = new PrismaClient();

const VALID = [
  "SUPERADMIN",
  "BUSINESS_ADMIN",
  "DEMO_ADMIN",
  "CONTENT_ADMIN",
  "NONE",
  "ADMIN",
] as const;

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  let roleArg = (process.argv[3] ?? "DEMO_ADMIN").toUpperCase();

  if (!email) {
    console.error(
      "사용법: npx tsx scripts/grant-platform-role.ts <email> [BUSINESS_ADMIN|DEMO_ADMIN|CONTENT_ADMIN|SUPERADMIN|NONE]",
    );
    process.exit(1);
  }

  if (roleArg === "ADMIN") roleArg = "DEMO_ADMIN";

  if (!VALID.includes(roleArg as (typeof VALID)[number])) {
    console.error(`역할은 ${VALID.join(" | ")} 중 하나여야 합니다.`);
    process.exit(1);
  }

  const role = roleArg as PlatformRole;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`사용자를 찾을 수 없습니다: ${email}`);
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

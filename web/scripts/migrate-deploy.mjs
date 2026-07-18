import { spawnSync } from "node:child_process";

const FAILED_MIGRATION = "20260711140000_business_demo_admin_member";

function run(command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (output.trim()) process.stdout.write(output);
  return { status: result.status ?? 1, output };
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim();

// Preview/로컬에서 DB env가 없으면 빌드를 막지 않는다.
// Production에서는 Vercel에 DATABASE_URL·DIRECT_URL이 있어야 한다.
if (!databaseUrl || !directUrl) {
  console.warn(
    "[migrate-deploy] DATABASE_URL 또는 DIRECT_URL이 없어 migrate deploy를 건너뜁니다.",
  );
  process.exit(0);
}

let { status, output } = run("npx prisma migrate deploy");

if (
  status !== 0 &&
  output.includes("P3009") &&
  output.includes(FAILED_MIGRATION)
) {
  console.warn(
    `[migrate-deploy] Recovering failed migration ${FAILED_MIGRATION} (P3009)...`,
  );
  const resolve = run(
    `npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}`,
  );
  if (resolve.status !== 0) process.exit(resolve.status);
  ({ status } = run("npx prisma migrate deploy"));
}

process.exit(status);

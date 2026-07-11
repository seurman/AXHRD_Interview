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

import { spawnSync } from "node:child_process";

/** Known one-shot recoveries for migrations that previously failed mid-apply. */
const RECOVERABLE_FAILED_MIGRATIONS = [
  "20260711140000_business_demo_admin_member",
  "20260718120000_assessment_task_cms_voice",
];

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

if (status !== 0 && output.includes("P3009")) {
  const failed = RECOVERABLE_FAILED_MIGRATIONS.find((name) =>
    output.includes(name),
  );
  if (failed) {
    console.warn(
      `[migrate-deploy] Recovering failed migration ${failed} (P3009)...`,
    );
    const resolve = run(`npx prisma migrate resolve --rolled-back ${failed}`);
    if (resolve.status !== 0) process.exit(resolve.status);
    ({ status, output } = run("npx prisma migrate deploy"));
  }
}

// 역량평가 데모 과제(역할연기·서류함) — 멱등 upsert. 실패해도 빌드는 계속.
if (status === 0) {
  console.log("[migrate-deploy] Seeding evidence assessment demos…");
  const seed = run("npx tsx prisma/seed/evidence-assessment.ts");
  if (seed.status !== 0) {
    console.warn(
      "[migrate-deploy] evidence assessment seed failed (non-fatal). Use /admin/content/assessment → 「데모 과제 넣기」.",
    );
  }
}

process.exit(status);

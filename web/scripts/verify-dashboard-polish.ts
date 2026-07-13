/**
 * Dashboard polish acceptance checks against local DB.
 * Run: npx tsx scripts/verify-dashboard-polish.ts
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { COMPETENCY_CODES } from "../src/types";
import { buildDimensionTimeline } from "../src/lib/dashboard/dimension-timeline";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      sessions: {
        where: { status: "COMPLETED" },
        select: { id: true, sessionNumber: true },
        orderBy: { sessionNumber: "asc" },
      },
      competencyLogs: {
        select: { competency: true, sessionId: true },
      },
    },
    take: 50,
  });

  const dimensionRows = await prisma.responseRecord.findMany({
    where: {
      isBonusQuestion: false,
      dimensions: { not: Prisma.DbNull },
      session: { status: "COMPLETED" },
    },
    select: {
      dimensions: true,
      session: { select: { userId: true, sessionNumber: true } },
    },
  });

  console.log("=== 6-axis dimensions storage ===");
  const sample = dimensionRows[0]?.dimensions;
  if (sample && typeof sample === "object") {
    console.log("Sample keys:", Object.keys(sample as object).join(", "));
  } else {
    console.log("No dimension rows in DB");
  }
  console.log(`Total response records with dimensions: ${dimensionRows.length}`);

  for (const user of users) {
    const assessed = new Set(user.competencyLogs.map((l) => l.competency));
    const assessedCount = assessed.size;
    const sessionCount = user.sessions.length;

    const userDims = dimensionRows.filter((r) => r.session.userId === user.id);
    const timeline = buildDimensionTimeline(
      userDims.map((r) => ({
        dimensions: r.dimensions,
        sessionNumber: r.session.sessionNumber,
      })),
    );

    if (assessedCount <= 2 || sessionCount === 2 || timeline.length >= 2) {
      console.log("\n---", user.email ?? user.name, "---");
      console.log(`  assessed competencies: ${assessedCount} [${[...assessed].join(", ")}]`);
      console.log(`  completed sessions: ${sessionCount}`);
      console.log(`  dimension timeline sessions: ${timeline.length}`);
      console.log(`  radar placeholder expected: ${assessedCount < 3}`);
      console.log(`  theta dots-only expected: ${sessionCount < 3 && sessionCount > 0}`);
      console.log(`  dimension trend visible: ${timeline.length >= 2}`);
    }
  }

  const lowAssessed = users.filter((u) => new Set(u.competencyLogs.map((l) => l.competency)).size <= 2);
  const twoSessions = users.filter((u) => u.sessions.length === 2);
  const dimensionReady = users.filter((u) => {
    const timeline = buildDimensionTimeline(
      dimensionRows
        .filter((r) => r.session.userId === u.id)
        .map((r) => ({ dimensions: r.dimensions, sessionNumber: r.session.sessionNumber })),
    );
    return timeline.length >= 2;
  });

  console.log("\n=== Test account picks ===");
  console.log("1-2 competencies:", lowAssessed.map((u) => u.email).join(", ") || "(none)");
  console.log("Exactly 2 sessions:", twoSessions.map((u) => u.email).join(", ") || "(none)");
  console.log("Dimension trend ready:", dimensionReady.map((u) => u.email).join(", ") || "(none — no dimensions in DB yet)");

  const has6axis =
    sample &&
    typeof sample === "object" &&
    "situationSpecificity" in (sample as object) &&
    "individualOwnership" in (sample as object);
  console.log("\n=== Acceptance summary ===");
  console.log(`6-axis format in DB: ${has6axis ? "YES" : "NO/UNKNOWN (code ready, awaiting interview data)"}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

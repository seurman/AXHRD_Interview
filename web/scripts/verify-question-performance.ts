/**
 * One-off: find competency with most ResponseRecords and print question performance flags.
 * Usage: npx tsx scripts/verify-question-performance.ts
 */
import { prisma } from "../src/lib/prisma";
import { getCompetencyWorkspace } from "../src/lib/repository/service";

async function main() {
  const grouped = await prisma.responseRecord.groupBy({
    by: ["competency"],
    where: { isBonusQuestion: false, questionId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { questionId: "desc" } },
    take: 5,
  });

  if (grouped.length === 0) {
    console.log("No response records found.");
    return;
  }

  console.log("Top competencies by response count:");
  for (const row of grouped) {
    console.log(`  ${row.competency}: ${row._count._all} responses`);
  }

  const topCode = grouped[0].competency;
  const competency = await prisma.competency.findFirst({
    where: { code: topCode },
    select: { id: true, code: true, nameKo: true },
  });

  if (!competency) {
    console.log(`Competency not found for code: ${topCode}`);
    return;
  }

  const workspace = await getCompetencyWorkspace(competency.id);
  if (!workspace) {
    console.log("Workspace not found.");
    return;
  }

  const flagCounts: Record<string, number> = {};
  for (const q of workspace.questions) {
    flagCounts[q.performance.flag] = (flagCounts[q.performance.flag] ?? 0) + 1;
  }

  console.log(`\n=== ${competency.nameKo} (${competency.code}) ===`);
  console.log(`Questions: ${workspace.questions.length}`);
  console.log("Flag distribution:", flagCounts);

  const samples = workspace.questions
    .filter((q) => q.performance.sampleSize > 0)
    .sort((a, b) => b.performance.sampleSize - a.performance.sampleSize);

  console.log("\nSample questions (top 8 by sample size):");
  for (const q of samples.slice(0, 8)) {
    const p = q.performance;
    console.log(
      [
        q.externalId,
        `n=${p.sampleSize}`,
        `avg=${(p.avgRubricScore * 100).toFixed(0)}%`,
        `fu=${(p.followUpRate * 100).toFixed(0)}%`,
        `L/M/H=${p.scoreDistribution.low}/${p.scoreDistribution.mid}/${p.scoreDistribution.high}`,
        `flag=${p.flag}`,
      ].join(" | "),
    );
  }

  const flagged = workspace.questions.filter(
    (q) => q.performance.flag !== "정상" && q.performance.flag !== "표본부족",
  );
  if (flagged.length > 0) {
    console.log("\nFlagged (너무쉬움 / 너무어려움_모호함):");
    for (const q of flagged.slice(0, 6)) {
      const p = q.performance;
      console.log(
        `  ${q.externalId}: avg=${(p.avgRubricScore * 100).toFixed(0)}%, fu=${(p.followUpRate * 100).toFixed(0)}% → ${p.flag}`,
      );
    }
  } else {
    console.log("\nNo 너무쉬움/너무어려움 flags in this competency (may need more data or thresholds).");
  }

  const zeroSample = workspace.questions.filter((q) => q.performance.sampleSize === 0);
  console.log(`\n표본부족 (n=0): ${zeroSample.length} questions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

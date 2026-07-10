import type { Industry, JobRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MIN_SAMPLE = 30;

export type IndustryInsightRow = {
  competency: string;
  avgPercentile: number;
  sampleCount: number;
};

export type IndustryInsight = {
  industry: Industry;
  jobRole: JobRole;
  sampleCount: number;
  competencies: IndustryInsightRow[];
};

/**
 * 산업×직무 스코프 역량 집계 — 익명·집계만, UI 미노출(내부 준비).
 * 표본 30명 미만이면 null (캠페인용보다 보수적).
 */
export async function getIndustryInsight(
  industry: Industry,
  jobRole: JobRole,
): Promise<IndustryInsight | null> {
  const sessions = await prisma.interviewSession.findMany({
    where: {
      jobRole,
      status: "COMPLETED",
      targetCompany: { industryCode: industry },
    },
    select: { id: true, userId: true },
  });

  if (sessions.length === 0) return null;

  const sessionIds = sessions.map((s) => s.id);
  const snapshots = await prisma.competencySnapshot.findMany({
    where: { sessionId: { in: sessionIds } },
    select: {
      competency: true,
      percentile: true,
      userId: true,
    },
  });

  const uniqueUsers = new Set(snapshots.map((s) => s.userId));
  if (uniqueUsers.size < MIN_SAMPLE) return null;

  const byComp = new Map<string, { sum: number; n: number }>();
  for (const s of snapshots) {
    const cur = byComp.get(s.competency) ?? { sum: 0, n: 0 };
    cur.sum += s.percentile;
    cur.n += 1;
    byComp.set(s.competency, cur);
  }

  const competencies: IndustryInsightRow[] = [...byComp.entries()].map(([competency, v]) => ({
    competency,
    avgPercentile: v.sum / v.n,
    sampleCount: v.n,
  }));

  return {
    industry,
    jobRole,
    sampleCount: uniqueUsers.size,
    competencies: competencies.sort((a, b) => b.avgPercentile - a.avgPercentile),
  };
}

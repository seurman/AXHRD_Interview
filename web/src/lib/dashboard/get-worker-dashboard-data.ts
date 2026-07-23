import { prisma } from "@/lib/prisma";

export type WorkerAssessmentAttempt = {
  id: string;
  scenarioId: string;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  overallScore: number | null;
  scenarioTitle: string;
  scenarioKind: string;
};

export type WorkerDashboardData = {
  attempts: WorkerAssessmentAttempt[];
  publishedScenarioCount: number;
  completedCount: number;
  inProgressCount: number;
  latestScore: number | null;
};

export const EMPTY_WORKER_DASHBOARD: WorkerDashboardData = {
  attempts: [],
  publishedScenarioCount: 0,
  completedCount: 0,
  inProgressCount: 0,
  latestScore: null,
};

function toScore(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Worker (assessment) dashboard payload.
 * Mirrors /assessment query shape: attempts without a required scenario include
 * (orphaned/inconsistent FKs must not 500 the page).
 */
export async function getWorkerDashboardData(
  userId: string,
  organizationId: string | null,
): Promise<WorkerDashboardData> {
  try {
    const [scenarios, attempts] = await Promise.all([
      prisma.assessmentScenario.findMany({
        where: {
          isActive: true,
          status: "PUBLISHED",
          OR: [
            { organizationId: null },
            ...(organizationId ? [{ organizationId }] : []),
          ],
        },
        select: { id: true },
      }),
      // Same as /assessment — do not include required `scenario` relation.
      // Prisma throws on inconsistent required relations; lookup by id instead.
      prisma.assessmentAttempt.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          scenarioId: true,
          status: true,
          createdAt: true,
          submittedAt: true,
          report: { select: { overallScore: true } },
        },
      }),
    ]);

    const scenarioIds = [...new Set(attempts.map((a) => a.scenarioId))];
    const scenarioRows =
      scenarioIds.length === 0
        ? []
        : await prisma.assessmentScenario.findMany({
            where: { id: { in: scenarioIds } },
            select: { id: true, titleKo: true, kind: true },
          });
    const scenarioById = new Map(scenarioRows.map((s) => [s.id, s]));

    const mapped: WorkerAssessmentAttempt[] = attempts.map((a) => {
      const scenario = scenarioById.get(a.scenarioId);
      return {
        id: a.id,
        scenarioId: a.scenarioId,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        submittedAt: a.submittedAt?.toISOString() ?? null,
        overallScore: toScore(a.report?.overallScore),
        scenarioTitle: scenario?.titleKo ?? "삭제된 과제",
        scenarioKind: scenario?.kind ?? "—",
      };
    });

    const completed = mapped.filter((a) => a.status === "SCORED" || a.status === "SUBMITTED");
    const inProgress = mapped.filter((a) => a.status === "IN_PROGRESS" || a.status === "DRAFT");

    return {
      attempts: mapped,
      publishedScenarioCount: scenarios.length,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      latestScore: completed.find((a) => a.overallScore != null)?.overallScore ?? null,
    };
  } catch (e) {
    console.error("[getWorkerDashboardData]", e);
    return EMPTY_WORKER_DASHBOARD;
  }
}

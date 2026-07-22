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

export async function getWorkerDashboardData(userId: string, organizationId: string | null) {
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
        scenario: { select: { titleKo: true, kind: true } },
      },
    }),
  ]);

  const mapped: WorkerAssessmentAttempt[] = attempts.map((a) => ({
    id: a.id,
    scenarioId: a.scenarioId,
    status: a.status,
    createdAt: a.createdAt.toISOString(),
    submittedAt: a.submittedAt?.toISOString() ?? null,
    overallScore:
      a.report?.overallScore == null ? null : Number(a.report.overallScore),
    scenarioTitle: a.scenario.titleKo,
    scenarioKind: a.scenario.kind,
  }));

  const completed = mapped.filter((a) => a.status === "SCORED" || a.status === "SUBMITTED");
  const inProgress = mapped.filter((a) => a.status === "IN_PROGRESS" || a.status === "DRAFT");

  const data: WorkerDashboardData = {
    attempts: mapped,
    publishedScenarioCount: scenarios.length,
    completedCount: completed.length,
    inProgressCount: inProgress.length,
    latestScore: completed.find((a) => a.overallScore != null)?.overallScore ?? null,
  };
  return data;
}

import { prisma } from "@/lib/prisma";
import { parseEvidenceAssessmentReport } from "@/lib/assessment/evidence-report";

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

export type WorkerScoreTrendPoint = {
  attemptId: string;
  at: string;
  score: number;
};

export type WorkerCompetencyAverage = {
  code: string;
  nameKo: string;
  avgScore: number;
  attemptCount: number;
};

export type WorkerDashboardData = {
  attempts: WorkerAssessmentAttempt[];
  publishedScenarioCount: number;
  completedCount: number;
  inProgressCount: number;
  latestScore: number | null;
  /** 완료 시도 시간순 점수 추이(오름차순) */
  scoreTrend: WorkerScoreTrendPoint[];
  /** 시도들의 EvidenceAssessmentReport를 역량코드로 묶어 평균낸 값(약점 우선 정렬) */
  competencyAverages: WorkerCompetencyAverage[];
};

export const EMPTY_WORKER_DASHBOARD: WorkerDashboardData = {
  attempts: [],
  publishedScenarioCount: 0,
  completedCount: 0,
  inProgressCount: 0,
  latestScore: null,
  scoreTrend: [],
  competencyAverages: [],
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
          report: { select: { overallScore: true, reportJson: true } },
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

    const scoreTrend: WorkerScoreTrendPoint[] = mapped
      .filter((a) => a.overallScore != null && a.submittedAt != null)
      .map((a) => ({ attemptId: a.id, at: a.submittedAt as string, score: a.overallScore as number }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const competencySums = new Map<string, { nameKo: string; sum: number; count: number }>();
    for (const a of attempts) {
      const parsed = parseEvidenceAssessmentReport(a.report?.reportJson);
      if (!parsed) continue;
      for (const comp of parsed.competencies) {
        const entry = competencySums.get(comp.code) ?? { nameKo: comp.nameKo, sum: 0, count: 0 };
        entry.sum += comp.score;
        entry.count += 1;
        competencySums.set(comp.code, entry);
      }
    }
    const competencyAverages: WorkerCompetencyAverage[] = [...competencySums.entries()]
      .map(([code, v]) => ({
        code,
        nameKo: v.nameKo,
        avgScore: Math.round((v.sum / v.count) * 100) / 100,
        attemptCount: v.count,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    return {
      attempts: mapped,
      publishedScenarioCount: scenarios.length,
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      latestScore: completed.find((a) => a.overallScore != null)?.overallScore ?? null,
      scoreTrend,
      competencyAverages,
    };
  } catch (e) {
    console.error("[getWorkerDashboardData]", e);
    return EMPTY_WORKER_DASHBOARD;
  }
}

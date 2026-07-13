import { prisma } from "@/lib/prisma";
import { getCohortData } from "@/lib/org/cohort";
import { getCompetencyHomeData } from "@/lib/org/competency-home-data";
import type { OrgEntitlementSnapshot } from "@/lib/org/entitlements";

export type OrgOverviewData = {
  organizationName: string;
  interview: {
    memberCount: number;
    totalCompletedSessions: number;
    overallAvgPercentile: number | null;
    weakestCompetency: string | null;
  } | null;
  competency: {
    kitCompetencyCount: number;
    activeShareCount: number;
    completedApplicantSessions: number;
  } | null;
  diagnostic: {
    latestWaveLabel: string | null;
    latestWaveStatus: string | null;
    responseCount: number;
    teamCount: number;
  } | null;
};

/** 복합 entitlement 기관 홈 — 상품별 요약 지표 */
export async function getOrgOverviewData(
  organizationId: string,
  entitlements: OrgEntitlementSnapshot,
): Promise<OrgOverviewData> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  if (!org) {
    return {
      organizationName: "",
      interview: null,
      competency: null,
      diagnostic: null,
    };
  }

  const [cohort, competency, latestWave] = await Promise.all([
    entitlements.interview ? getCohortData(organizationId) : Promise.resolve(null),
    entitlements.competency
      ? getCompetencyHomeData(organizationId)
      : Promise.resolve(null),
    entitlements.diagnostic
      ? prisma.diagnosticWave.findFirst({
          where: { organizationId },
          orderBy: { waveNumber: "desc" },
          include: {
            _count: {
              select: {
                teams: { where: { level: "TEAM" } },
                responses: { where: { submittedAt: { not: null } } },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    organizationName: org.name,
    interview: cohort
      ? {
          memberCount: cohort.memberCount,
          totalCompletedSessions: cohort.totalCompletedSessions,
          overallAvgPercentile: cohort.overallAvgPercentile,
          weakestCompetency: cohort.competencies[0]?.competency ?? null,
        }
      : null,
    competency: competency
      ? {
          kitCompetencyCount: competency.kitCompetencyCount,
          activeShareCount: competency.activeShareCount,
          completedApplicantSessions: competency.completedApplicantSessions,
        }
      : null,
    diagnostic: latestWave
      ? {
          latestWaveLabel: latestWave.label ?? `Wave ${latestWave.waveNumber}`,
          latestWaveStatus: latestWave.status,
          responseCount: latestWave._count.responses,
          teamCount: latestWave._count.teams,
        }
      : null,
  };
}

import { prisma } from "@/lib/prisma";

export type CompetencyHomeData = {
  kitCompetencyCount: number;
  activeShareCount: number;
  completedApplicantSessions: number;
  recentShares: Array<{
    id: string;
    label: string;
    slug: string;
    isActive: boolean;
    completedCount: number;
    expiresAt: string | null;
  }>;
};

/** 역량평가 SaaS 홈 — 인터뷰 킷·공유 링크·지원자 평가 현황 */
export async function getCompetencyHomeData(
  organizationId: string,
): Promise<CompetencyHomeData> {
  const [kits, shares, completedApplicantSessions] = await Promise.all([
    prisma.orgInterviewKit.count({ where: { organizationId } }),
    prisma.orgInterviewKitShare.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        _count: {
          select: {
            sessions: { where: { status: "COMPLETED" } },
          },
        },
      },
    }),
    prisma.interviewSession.count({
      where: {
        kitOrganizationId: organizationId,
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    kitCompetencyCount: kits,
    activeShareCount: shares.filter((s) => s.isActive).length,
    completedApplicantSessions,
    recentShares: shares.map((s) => ({
      id: s.id,
      label: s.label,
      slug: s.slug,
      isActive: s.isActive,
      completedCount: s._count.sessions,
      expiresAt: s.expiresAt?.toISOString() ?? null,
    })),
  };
}

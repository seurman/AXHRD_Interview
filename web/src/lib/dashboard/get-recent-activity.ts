import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import type { ActivityItem } from "@/components/dashboard/RecentActivityPanel";

/**
 * 완료한 모의면접 · 자기발견 인터뷰 · 자소서 첨삭을 최신순으로 합쳐서 반환한다.
 * 홈 대시보드 미리보기(`/dashboard`)와 전체 활동 페이지(`/dashboard/activity`)가 공유 —
 * limit만 다르게 줘서 재사용한다.
 */
export async function getRecentActivityItems(
  userId: string,
  limit: number,
): Promise<ActivityItem[]> {
  const source = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sessions: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: limit,
        select: {
          id: true,
          sessionNumber: true,
          completedAt: true,
          startedAt: true,
          createdAt: true,
          focusCompetency: true,
        },
      },
      selfDiscoverySessions: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: limit,
        select: { id: true, completedAt: true, startedAt: true },
      },
      resumeReviews: {
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, createdAt: true },
      },
    },
  });

  if (!source) return [];

  const items: ActivityItem[] = [
    ...source.sessions.map((s) => {
      const startedAt = s.startedAt ?? s.createdAt;
      const completedAt = s.completedAt ?? startedAt;
      return {
        id: s.id,
        kind: "interview" as const,
        title: s.focusCompetency
          ? `${competencyLabel(s.focusCompetency)} 모의면접 #${s.sessionNumber}`
          : `모의면접 #${s.sessionNumber}`,
        subtitle: "면접 리포트 보기",
        href: `/interview/${s.id}/report`,
        competency: s.focusCompetency ? competencyLabel(s.focusCompetency) : undefined,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      };
    }),
    ...source.selfDiscoverySessions.map((s) => ({
      id: s.id,
      kind: "discover" as const,
      title: "자기발견 인터뷰",
      subtitle: "강점 리포트 보기",
      href: `/discover/${s.id}/report`,
      startedAt: s.startedAt.toISOString(),
      completedAt: (s.completedAt ?? s.startedAt).toISOString(),
    })),
    ...source.resumeReviews.map((r) => ({
      id: r.id,
      kind: "resume" as const,
      title: "자소서 첨삭",
      subtitle: "첨삭 결과 보기",
      href: `/resume-review/${r.id}`,
      completedAt: r.createdAt.toISOString(),
    })),
  ];

  return items
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
}

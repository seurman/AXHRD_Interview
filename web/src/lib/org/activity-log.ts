import { prisma } from "@/lib/prisma";
import { competencyLabel } from "@/lib/labels";
import { COHORT_MEMBER_ROLES } from "@/lib/auth/roles";

export type OrgActivityRow = {
  id: string;
  kind: "interview" | "discover";
  memberId: string;
  memberName: string;
  title: string;
  competency?: string;
  startedAt?: string;
  completedAt: string;
  /** 상세 코칭 리포트 링크 — 구성원이 상세 공유에 동의(orgCoachingConsent)했을 때만 존재 */
  detailHref: string | null;
};

/**
 * 기관 소속 구성원 전체의 활동(모의면접·자기발견 인터뷰 완료)을 최신순으로 합쳐서 반환한다.
 * 답변 원문·점수 상세는 노출하지 않는다 — "누가 언제 어떤 역량으로 무엇을 했는지"만 보여준다
 * (기존 참여 현황의 학생 요약 테이블과 동일한 공개 범위).
 */
export async function getOrgActivityLog(
  organizationId: string,
  limit: number,
): Promise<OrgActivityRow[]> {
  const members = await prisma.user.findMany({
    where: { organizationId, orgRole: { in: [...COHORT_MEMBER_ROLES] } },
    select: { id: true, name: true, orgCoachingConsent: true },
  });
  if (members.length === 0) return [];

  const memberIds = members.map((m) => m.id);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const [sessions, discoverSessions] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId: { in: memberIds }, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        sessionNumber: true,
        focusCompetency: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.selfDiscoverySession.findMany({
      where: { userId: { in: memberIds }, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: { id: true, userId: true, startedAt: true, completedAt: true },
    }),
  ]);

  const rows: OrgActivityRow[] = [
    ...sessions.map((s) => {
      const member = memberById.get(s.userId);
      const startedAt = s.startedAt ?? s.createdAt;
      const completedAt = s.completedAt ?? startedAt;
      return {
        id: s.id,
        kind: "interview" as const,
        memberId: s.userId,
        memberName: member?.name ?? "알 수 없음",
        title: s.focusCompetency
          ? `${competencyLabel(s.focusCompetency)} 모의면접 #${s.sessionNumber}`
          : `모의면접 #${s.sessionNumber}`,
        competency: s.focusCompetency ? competencyLabel(s.focusCompetency) : undefined,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        detailHref: member?.orgCoachingConsent ? `/org/dashboard/members/${s.userId}` : null,
      };
    }),
    ...discoverSessions.map((s) => {
      const member = memberById.get(s.userId);
      return {
        id: s.id,
        kind: "discover" as const,
        memberId: s.userId,
        memberName: member?.name ?? "알 수 없음",
        title: "자기발견 인터뷰",
        startedAt: s.startedAt.toISOString(),
        completedAt: (s.completedAt ?? s.startedAt).toISOString(),
        detailHref: member?.orgCoachingConsent ? `/org/dashboard/members/${s.userId}` : null,
      };
    }),
  ];

  return rows
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
}

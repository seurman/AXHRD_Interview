/**
 * 기관 어드민 — 구성원 현황·역량 시계열·피드백용 데이터 계층
 */
import { prisma } from "@/lib/prisma";
import { isLikelyOnline } from "@/lib/auth/presence";
import { buildDimensionTimeline } from "@/lib/dashboard/dimension-timeline";
import type { DimensionSessionPoint } from "@/lib/dashboard/dimension-timeline";
import { competencyLabel } from "@/lib/labels";

export type PeopleMemberRow = {
  id: string;
  name: string;
  email: string;
  orgRole: string;
  joinedAt: string;
  coachingConsent: boolean;
  completedInterviews: number;
  inProgressInterviews: number;
  abandonedInterviews: number;
  avgPercentile: number | null;
  deltaPercentile: number | null;
  strongestCompetency: string | null;
  weakestCompetency: string | null;
  lastInterviewAt: string | null;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
  online: boolean;
  unreadFeedbackCount: number;
  assessmentAttempts: number;
  sparkline: number[];
};

export type OrgPeopleDashboardData = {
  organizationName: string;
  summary: {
    memberCount: number;
    onlineCount: number;
    activeThisWeek: number;
    totalCompletedInterviews: number;
    overallAvgPercentile: number | null;
    consentCount: number;
    unreadFeedbackCount: number;
  };
  members: PeopleMemberRow[];
};

export type MemberCompetencySeriesPoint = {
  date: string;
  sessionNumber: number;
  competency: string;
  competencyLabel: string;
  percentile: number;
  theta: number;
};

export type OrgMemberDetailData = {
  member: {
    id: string;
    name: string;
    email: string;
    orgRole: string;
    joinedAt: string;
    coachingConsent: boolean;
    lastLoginAt: string | null;
    lastLogoutAt: string | null;
    online: boolean;
  };
  interviews: {
    completed: number;
    inProgress: number;
    abandoned: number;
    lastCompletedAt: string | null;
    recent: Array<{
      id: string;
      sessionNumber: number;
      focusCompetency: string | null;
      completedAt: string | null;
      overallTheta: number | null;
    }>;
  };
  scores: {
    avgPercentile: number | null;
    latestByCompetency: Array<{
      competency: string;
      label: string;
      percentile: number;
      theta: number;
      levelEst: number;
      recordedAt: string;
    }>;
  };
  competencySeries: MemberCompetencySeriesPoint[];
  dimensionTimeline: DimensionSessionPoint[];
  assessmentAttempts: number;
  feedback: Array<{
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    readAt: string | null;
  }>;
};

function toIso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function startOfWeek(now = new Date()): Date {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export async function getOrgPeopleDashboard(
  organizationId: string,
): Promise<OrgPeopleDashboardData | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, status: true },
  });
  if (!org) return null;

  const members = await prisma.user.findMany({
    // 멤버·승인 화면과 동일하게 기관 소속 전원 표시 (MEMBER/STUDENT만이 아니라 STAFF/ADMIN 포함)
    where: { organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      orgRole: true,
      createdAt: true,
      orgCoachingConsent: true,
      lastLoginAt: true,
      lastLogoutAt: true,
    },
    orderBy: [{ orgRole: "asc" }, { name: "asc" }],
  });
  const memberIds = members.map((m) => m.id);

  if (memberIds.length === 0) {
    return {
      organizationName: org.name,
      summary: {
        memberCount: 0,
        onlineCount: 0,
        activeThisWeek: 0,
        totalCompletedInterviews: 0,
        overallAvgPercentile: null,
        consentCount: 0,
        unreadFeedbackCount: 0,
      },
      members: [],
    };
  }

  const weekStart = startOfWeek();

  const [sessions, snapshots, feedbackUnread, assessmentAttempts] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId: { in: memberIds } },
      select: {
        userId: true,
        status: true,
        completedAt: true,
        sessionNumber: true,
      },
    }),
    prisma.competencySnapshot.findMany({
      where: { userId: { in: memberIds } },
      orderBy: { recordedAt: "asc" },
      select: {
        userId: true,
        competency: true,
        percentile: true,
        theta: true,
        recordedAt: true,
      },
    }),
    prisma.orgMemberFeedback.groupBy({
      by: ["memberUserId"],
      where: {
        organizationId,
        memberUserId: { in: memberIds },
        readAt: null,
      },
      _count: { _all: true },
    }),
    prisma.assessmentAttempt.groupBy({
      by: ["userId"],
      where: { userId: { in: memberIds } },
      _count: { _all: true },
    }),
  ]);

  const unreadByMember = new Map(
    feedbackUnread.map((r) => [r.memberUserId, r._count._all]),
  );
  const assessmentByMember = new Map(
    assessmentAttempts.map((r) => [r.userId, r._count._all]),
  );

  const sessionsByUser = new Map<
    string,
    { completed: number; inProgress: number; abandoned: number; lastAt: Date | null }
  >();
  for (const s of sessions) {
    const row = sessionsByUser.get(s.userId) ?? {
      completed: 0,
      inProgress: 0,
      abandoned: 0,
      lastAt: null,
    };
    if (s.status === "COMPLETED") {
      row.completed += 1;
      if (s.completedAt && (!row.lastAt || s.completedAt > row.lastAt)) {
        row.lastAt = s.completedAt;
      }
    } else if (s.status === "IN_PROGRESS" || s.status === "SETUP") {
      row.inProgress += 1;
    } else if (s.status === "ABANDONED") {
      row.abandoned += 1;
    }
    sessionsByUser.set(s.userId, row);
  }

  const snapsByUser = new Map<string, typeof snapshots>();
  for (const snap of snapshots) {
    const list = snapsByUser.get(snap.userId) ?? [];
    list.push(snap);
    snapsByUser.set(snap.userId, list);
  }

  const rows: PeopleMemberRow[] = members.map((m) => {
    const sess = sessionsByUser.get(m.id) ?? {
      completed: 0,
      inProgress: 0,
      abandoned: 0,
      lastAt: null,
    };
    const snaps = snapsByUser.get(m.id) ?? [];
    const latest = new Map<string, (typeof snaps)[number]>();
    for (const s of snaps) latest.set(s.competency, s);
    const latestList = [...latest.values()];
    const avgPercentile =
      latestList.length > 0
        ? Math.round(
            latestList.reduce((sum, s) => sum + s.percentile, 0) / latestList.length,
          )
        : null;

    let strongest: string | null = null;
    let weakest: string | null = null;
    if (latestList.length > 0) {
      const sorted = [...latestList].sort((a, b) => b.percentile - a.percentile);
      strongest = sorted[0].competency;
      weakest = sorted[sorted.length - 1].competency;
    }

    // 최근 최대 8개 스냅샷의 백분위 스파크라인 (시간순)
    const sparkline = snaps.slice(-8).map((s) => Math.round(s.percentile));

    // 첫·마지막 평균으로 향상도 근사
    let deltaPercentile: number | null = null;
    if (snaps.length >= 2) {
      const firstHalf = snaps.slice(0, Math.ceil(snaps.length / 3));
      const lastHalf = snaps.slice(-Math.ceil(snaps.length / 3));
      const avg = (arr: typeof snaps) =>
        arr.reduce((s, x) => s + x.percentile, 0) / arr.length;
      deltaPercentile = Math.round(avg(lastHalf) - avg(firstHalf));
    }

    return {
      id: m.id,
      name: m.name,
      email: m.email,
      orgRole: m.orgRole,
      joinedAt: m.createdAt.toISOString(),
      coachingConsent: m.orgCoachingConsent,
      completedInterviews: sess.completed,
      inProgressInterviews: sess.inProgress,
      abandonedInterviews: sess.abandoned,
      avgPercentile,
      deltaPercentile,
      strongestCompetency: strongest,
      weakestCompetency: weakest,
      lastInterviewAt: toIso(sess.lastAt),
      lastLoginAt: toIso(m.lastLoginAt),
      lastLogoutAt: toIso(m.lastLogoutAt),
      online: isLikelyOnline(m.lastLoginAt, m.lastLogoutAt),
      unreadFeedbackCount: unreadByMember.get(m.id) ?? 0,
      assessmentAttempts: assessmentByMember.get(m.id) ?? 0,
      sparkline,
    };
  });

  const totalCompleted = rows.reduce((n, r) => n + r.completedInterviews, 0);
  const withAvg = rows.filter((r) => r.avgPercentile != null);
  const overallAvg =
    withAvg.length > 0
      ? Math.round(
          withAvg.reduce((n, r) => n + (r.avgPercentile ?? 0), 0) / withAvg.length,
        )
      : null;

  const activeThisWeek = rows.filter((r) => {
    const login = r.lastLoginAt ? new Date(r.lastLoginAt) : null;
    const interview = r.lastInterviewAt ? new Date(r.lastInterviewAt) : null;
    return (
      (login && login >= weekStart) || (interview && interview >= weekStart)
    );
  }).length;

  return {
    organizationName: org.name,
    summary: {
      memberCount: rows.length,
      onlineCount: rows.filter((r) => r.online).length,
      activeThisWeek,
      totalCompletedInterviews: totalCompleted,
      overallAvgPercentile: overallAvg,
      consentCount: rows.filter((r) => r.coachingConsent).length,
      unreadFeedbackCount: rows.reduce((n, r) => n + r.unreadFeedbackCount, 0),
    },
    members: rows,
  };
}

export async function getOrgMemberPeopleDetail(
  organizationId: string,
  memberUserId: string,
): Promise<OrgMemberDetailData | null> {
  const member = await prisma.user.findUnique({
    where: { id: memberUserId },
    select: {
      id: true,
      name: true,
      email: true,
      orgRole: true,
      organizationId: true,
      createdAt: true,
      orgCoachingConsent: true,
      lastLoginAt: true,
      lastLogoutAt: true,
    },
  });
  if (!member || member.organizationId !== organizationId) return null;

  const [sessions, snapshots, feedback, assessmentCount] = await Promise.all([
    prisma.interviewSession.findMany({
      where: { userId: memberUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        sessionNumber: true,
        focusCompetency: true,
        completedAt: true,
        overallTheta: true,
        responses: {
          select: { dimensions: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.competencySnapshot.findMany({
      where: { userId: memberUserId },
      orderBy: { recordedAt: "asc" },
    }),
    prisma.orgMemberFeedback.findMany({
      where: { organizationId, memberUserId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { author: { select: { name: true } } },
    }),
    prisma.assessmentAttempt.count({ where: { userId: memberUserId } }),
  ]);

  const completed = sessions.filter((s) => s.status === "COMPLETED");
  const inProgress = sessions.filter(
    (s) => s.status === "IN_PROGRESS" || s.status === "SETUP",
  ).length;
  const abandoned = sessions.filter((s) => s.status === "ABANDONED").length;

  const latest = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) latest.set(s.competency, s);
  const latestList = [...latest.values()].sort(
    (a, b) => b.percentile - a.percentile,
  );
  const avgPercentile =
    latestList.length > 0
      ? Math.round(
          latestList.reduce((n, s) => n + s.percentile, 0) / latestList.length,
        )
      : null;

  const sessionNumberById = new Map(
    sessions.map((s) => [s.id, s.sessionNumber]),
  );

  const competencySeries: MemberCompetencySeriesPoint[] = snapshots.map((s) => ({
    date: s.recordedAt.toISOString(),
    sessionNumber: sessionNumberById.get(s.sessionId) ?? 0,
    competency: s.competency,
    competencyLabel: competencyLabel(s.competency),
    percentile: Math.round(s.percentile),
    theta: s.theta,
  }));

  const dimensionRecords = completed.flatMap((s) =>
    s.responses.map((r) => ({
      sessionNumber: s.sessionNumber,
      dimensions: r.dimensions,
    })),
  );
  const dimensionTimeline = buildDimensionTimeline(dimensionRecords);

  return {
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      orgRole: member.orgRole,
      joinedAt: member.createdAt.toISOString(),
      coachingConsent: member.orgCoachingConsent,
      lastLoginAt: toIso(member.lastLoginAt),
      lastLogoutAt: toIso(member.lastLogoutAt),
      online: isLikelyOnline(member.lastLoginAt, member.lastLogoutAt),
    },
    interviews: {
      completed: completed.length,
      inProgress,
      abandoned,
      lastCompletedAt: toIso(completed[0]?.completedAt ?? null),
      recent: completed.slice(0, 8).map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        focusCompetency: s.focusCompetency,
        completedAt: toIso(s.completedAt),
        overallTheta: s.overallTheta,
      })),
    },
    scores: {
      avgPercentile,
      latestByCompetency: latestList.map((s) => ({
        competency: s.competency,
        label: competencyLabel(s.competency),
        percentile: Math.round(s.percentile),
        theta: s.theta,
        levelEst: s.levelEst,
        recordedAt: s.recordedAt.toISOString(),
      })),
    },
    competencySeries,
    dimensionTimeline,
    assessmentAttempts: assessmentCount,
    feedback: feedback.map((f) => ({
      id: f.id,
      body: f.body,
      authorName: f.author.name,
      createdAt: f.createdAt.toISOString(),
      readAt: toIso(f.readAt),
    })),
  };
}

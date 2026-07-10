import { prisma } from "@/lib/prisma";

export type PlatformTodoItem = {
  id: string;
  kindLabel: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
  at?: string;
  urgent: boolean;
};

export type OverviewChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export type HourlyBucket = {
  label: string;
  count: number;
};

export type PlatformHomeSnapshot = {
  pendingOrgs: number;
  approvedOrgs: number;
  openDiagnosticWaves: number;
  sessionsToday: number;
  reviewFlagUsers: number;
  todos: PlatformTodoItem[];
  recentAudit: Array<{
    id: string;
    summary: string;
    actorEmail: string;
    createdAt: string;
  }>;
  checklist: OverviewChecklistItem[];
  checklistDone: number;
  checklistTotal: number;
  arcIndexSeeded: boolean;
  activeSubscriptions: number;
  membersTotal: number;
  sessions6h: number;
  diagnosticResponses6h: number;
  sessionsHourly: HourlyBucket[];
  responsesHourly: HourlyBucket[];
  platformStatus: "ready" | "attention";
};

export type ContentHomeSnapshot = {
  platformCompetencies: number;
  platformQuestions: number;
  demoWorkspaces: number;
  orgCustomCompetencies: number;
};

function buildHourlyBuckets(
  rows: { createdAt: Date }[],
  hours = 6,
): HourlyBucket[] {
  const now = new Date();
  const buckets: HourlyBucket[] = [];

  for (let i = hours - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    start.setHours(start.getHours() - i);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    const label =
      i === 0
        ? "지금"
        : start.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    buckets.push({
      label,
      count: rows.filter((r) => r.createdAt >= start && r.createdAt < end).length,
    });
  }

  return buckets;
}

export async function loadContentHomeSnapshot(): Promise<ContentHomeSnapshot> {
  const [platformCompetencies, platformQuestions, demoWorkspaces, orgCustomCompetencies] =
    await Promise.all([
      prisma.competency.count({
        where: { ownerScope: "PLATFORM", organizationId: null },
      }),
      prisma.question.count({
        where: { ownerScope: "PLATFORM", organizationId: null },
      }),
      prisma.demoWorkspace.count(),
      prisma.competency.count({ where: { ownerScope: "ORG" } }),
    ]);

  return { platformCompetencies, platformQuestions, demoWorkspaces, orgCustomCompetencies };
}

export async function loadPlatformHomeSnapshot(): Promise<PlatformHomeSnapshot> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  const [
    pendingOrgs,
    approvedOrgs,
    openDiagnosticWaves,
    sessionsToday,
    reviewFlagUsers,
    pendingOrgRows,
    reviewUsers,
    recentAudit,
    arcInstrumentCount,
    activeSubscriptions,
    membersTotal,
    sessions6hRows,
    responses6hRows,
  ] = await Promise.all([
    prisma.organization.count({ where: { status: "PENDING" } }),
    prisma.organization.count({ where: { status: "APPROVED" } }),
    prisma.diagnosticWave.count({ where: { status: "OPEN" } }),
    prisma.interviewSession.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.user.count({ where: { signupFlag: "REVIEW" } }),
    prisma.organization.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        createdAt: true,
        members: {
          where: { orgRole: "ADMIN" },
          select: { email: true },
          take: 1,
        },
      },
    }),
    prisma.user.findMany({
      where: { signupFlag: "REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, summary: true, actorEmail: true, createdAt: true },
    }),
    prisma.diagnosticInstrument.count(),
    prisma.subscription.count({ where: { status: { not: "CANCELED" } } }),
    prisma.user.count({ where: { organizationId: { not: null } } }),
    prisma.interviewSession.findMany({
      where: { createdAt: { gte: sixHoursAgo } },
      select: { createdAt: true },
    }),
    prisma.diagnosticResponse.findMany({
      where: { submittedAt: { gte: sixHoursAgo, not: null } },
      select: { submittedAt: true },
    }).catch(() => [] as { submittedAt: Date | null }[]),
  ]);

  const arcIndexSeeded = arcInstrumentCount > 0;
  const sessionsHourly = buildHourlyBuckets(sessions6hRows);
  const responsesHourly = buildHourlyBuckets(
    responses6hRows
      .filter((r): r is { submittedAt: Date } => r.submittedAt != null)
      .map((r) => ({ createdAt: r.submittedAt })),
  );

  const checklist: OverviewChecklistItem[] = [
    {
      id: "pending-orgs",
      label: "승인 대기 기관 없음",
      done: pendingOrgs === 0,
      href: "/admin/organizations#pending",
    },
    {
      id: "review-users",
      label: "가입 REVIEW 플래그 없음",
      done: reviewFlagUsers === 0,
      href: "/admin/users?flag=review",
    },
    {
      id: "arc-seed",
      label: "ARC Index 문항뱅크 설치됨",
      done: arcIndexSeeded,
      href: "/admin/diagnostic",
    },
    {
      id: "active-orgs",
      label: "운영 중 기관 1개 이상",
      done: approvedOrgs > 0,
      href: "/admin/organizations#active",
    },
    {
      id: "active-subs",
      label: "활성 구독 1건 이상",
      done: activeSubscriptions > 0,
      href: "/admin/subscriptions",
    },
  ];

  const checklistDone = checklist.filter((c) => c.done).length;

  const todos: PlatformTodoItem[] = [
    ...pendingOrgRows.map((org) => ({
      id: `org-pending-${org.id}`,
      kindLabel: "기관",
      title: org.name,
      subtitle: org.members[0]?.email ?? "요청자 미상",
      href: `/admin/organizations/${org.id}`,
      meta: "승인 대기",
      at: org.createdAt.toISOString(),
      urgent: true,
    })),
    ...reviewUsers.map((u) => ({
      id: `user-review-${u.id}`,
      kindLabel: "가입",
      title: u.name ?? u.email,
      subtitle: u.email,
      href: `/admin/users?flag=review&q=${encodeURIComponent(u.email)}`,
      meta: "리뷰 플래그",
      at: u.createdAt.toISOString(),
      urgent: true,
    })),
  ];

  const platformStatus =
    pendingOrgs > 0 || reviewFlagUsers > 0 || todos.length > 0 ? "attention" : "ready";

  return {
    pendingOrgs,
    approvedOrgs,
    openDiagnosticWaves,
    sessionsToday,
    reviewFlagUsers,
    todos,
    recentAudit: recentAudit.map((l) => ({
      id: l.id,
      summary: l.summary,
      actorEmail: l.actorEmail,
      createdAt: l.createdAt.toISOString(),
    })),
    checklist,
    checklistDone,
    checklistTotal: checklist.length,
    arcIndexSeeded,
    activeSubscriptions,
    membersTotal,
    sessions6h: sessions6hRows.length,
    diagnosticResponses6h: responses6hRows.filter((r) => r.submittedAt != null).length,
    sessionsHourly,
    responsesHourly,
    platformStatus,
  };
}

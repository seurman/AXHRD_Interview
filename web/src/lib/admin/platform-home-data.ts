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
};

export type ContentHomeSnapshot = {
  platformCompetencies: number;
  platformQuestions: number;
  demoWorkspaces: number;
  orgCustomCompetencies: number;
};

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

  const [
    pendingOrgs,
    approvedOrgs,
    openDiagnosticWaves,
    sessionsToday,
    reviewFlagUsers,
    pendingOrgRows,
    reviewUsers,
    recentAudit,
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
      take: 6,
      select: { id: true, summary: true, actorEmail: true, createdAt: true },
    }),
  ]);

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
  };
}

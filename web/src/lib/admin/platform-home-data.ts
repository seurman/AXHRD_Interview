import { prisma } from "@/lib/prisma";

export type PlatformHomeSnapshot = {
  pendingOrgs: number;
  approvedOrgs: number;
  openDiagnosticWaves: number;
  sessionsToday: number;
  reviewFlagUsers: number;
  recentAudit: Array<{
    id: string;
    summary: string;
    actorEmail: string;
    createdAt: string;
  }>;
};

export async function loadPlatformHomeSnapshot(): Promise<PlatformHomeSnapshot> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [pendingOrgs, approvedOrgs, openDiagnosticWaves, sessionsToday, reviewFlagUsers, recentAudit] =
    await Promise.all([
      prisma.organization.count({ where: { status: "PENDING" } }),
      prisma.organization.count({ where: { status: "APPROVED" } }),
      prisma.diagnosticWave.count({ where: { status: "OPEN" } }),
      prisma.interviewSession.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.user.count({ where: { signupFlag: "REVIEW" } }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, summary: true, actorEmail: true, createdAt: true },
      }),
    ]);

  return {
    pendingOrgs,
    approvedOrgs,
    openDiagnosticWaves,
    sessionsToday,
    reviewFlagUsers,
    recentAudit: recentAudit.map((l) => ({
      id: l.id,
      summary: l.summary,
      actorEmail: l.actorEmail,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

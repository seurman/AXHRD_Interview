import { prisma } from "@/lib/prisma";
import { getCohortData } from "@/lib/org/cohort";

const ROLE_ORDER = { ADMIN: 0, STAFF: 1, STUDENT: 2 } as const;

export async function getOrgHubSnapshot(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          orgRole: true,
          platformRole: true,
          createdAt: true,
        },
      },
      interviewKits: {
        select: { competency: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        select: { planTier: true, status: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!org) return null;

  const cohort = await getCohortData(organizationId);

  const members = [...org.members].sort((a, b) => {
    const ra = ROLE_ORDER[a.orgRole as keyof typeof ROLE_ORDER] ?? 9;
    const rb = ROLE_ORDER[b.orgRole as keyof typeof ROLE_ORDER] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "ko");
  });

  const admins = members.filter((m) => m.orgRole === "ADMIN");
  const staff = members.filter((m) => m.orgRole === "STAFF");
  const students = members.filter((m) => m.orgRole === "STUDENT");

  return {
    id: org.id,
    name: org.name,
    joinCode: org.joinCode,
    status: org.status,
    createdAt: org.createdAt,
    approvedAt: org.approvedAt,
    rejectedAt: org.rejectedAt,
    personalizationEnabled: org.saasPersonalizationEnabled,
    personalizationEnabledAt: org.saasPersonalizationEnabledAt,
    kitCount: org.interviewKits.length,
    kits: org.interviewKits,
    subscription: org.subscriptions[0] ?? null,
    members,
    admins,
    staff,
    students,
    memberCount: members.length,
    studentCount: students.length,
    cohort: cohort
      ? {
          totalCompletedSessions: cohort.totalCompletedSessions,
          overallAvgPercentile: cohort.overallAvgPercentile,
        }
      : null,
  };
}

export type OrgHubSnapshot = NonNullable<Awaited<ReturnType<typeof getOrgHubSnapshot>>>;

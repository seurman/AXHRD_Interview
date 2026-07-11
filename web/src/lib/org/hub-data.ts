import { prisma } from "@/lib/prisma";
import { getCohortData } from "@/lib/org/cohort";
import { readOrgEntitlements } from "@/lib/org/entitlements";
import {
  formatOrgPeriod,
  getOrgContractStatus,
  resolveOrgSeatCap,
} from "@/lib/org/contract";

const ROLE_ORDER = { ADMIN: 0, STAFF: 1, MEMBER: 2, STUDENT: 2 } as const;

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

  const subscription = org.subscriptions[0] ?? null;
  const seatCap = resolveOrgSeatCap(org, subscription);
  const contractStatus = getOrgContractStatus(org);

  const members = [...org.members].sort((a, b) => {
    const ra = ROLE_ORDER[a.orgRole as keyof typeof ROLE_ORDER] ?? 9;
    const rb = ROLE_ORDER[b.orgRole as keyof typeof ROLE_ORDER] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "ko");
  });

  const admins = members.filter((m) => m.orgRole === "ADMIN");
  const staff = members.filter((m) => m.orgRole === "STAFF");
  const learners = members.filter(
    (m) => m.orgRole === "MEMBER" || m.orgRole === "STUDENT",
  );

  return {
    id: org.id,
    name: org.name,
    kind: org.kind,
    joinCode: org.joinCode,
    status: org.status,
    createdAt: org.createdAt,
    approvedAt: org.approvedAt,
    rejectedAt: org.rejectedAt,
    validFrom: org.validFrom,
    validUntil: org.validUntil,
    maxSeats: org.maxSeats,
    adminNotes: org.adminNotes,
    contractStatus,
    contractPeriodLabel: formatOrgPeriod(org.validFrom, org.validUntil),
    seatCap,
    personalizationEnabled: org.saasPersonalizationEnabled,
    personalizationEnabledAt: org.saasPersonalizationEnabledAt,
    diagnosticEnabled: org.diagnosticEnabled,
    interviewEnabled: org.interviewEnabled,
    entitlements: readOrgEntitlements(org),
    kitCount: org.interviewKits.length,
    kits: org.interviewKits,
    subscription,
    members,
    admins,
    staff,
    learners,
    students: learners,
    memberCount: members.length,
    studentCount: learners.length,
    cohort: cohort
      ? {
          totalCompletedSessions: cohort.totalCompletedSessions,
          overallAvgPercentile: cohort.overallAvgPercentile,
        }
      : null,
  };
}

export type OrgHubSnapshot = NonNullable<Awaited<ReturnType<typeof getOrgHubSnapshot>>>;

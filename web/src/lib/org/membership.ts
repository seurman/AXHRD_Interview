import type { Organization, OrgRole, Subscription } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canOrgAcceptMember,
  countOrgMembers,
  isOrgOperational,
  resolveOrgSeatCap,
} from "@/lib/org/contract";

export class MembershipError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "MembershipError";
  }
}

export async function countPendingMembershipRequests(organizationId: string): Promise<number> {
  return prisma.orgMembershipRequest.count({
    where: { organizationId, status: "PENDING" },
  });
}

/** 승인 멤버 + 대기 요청 + 대기 초대 — 좌석 예약(over-approve 방지) */
export async function countReservedSeats(organizationId: string): Promise<number> {
  const [members, pending, invites] = await Promise.all([
    countOrgMembers(organizationId),
    countPendingMembershipRequests(organizationId),
    prisma.orgInvitation.count({
      where: { organizationId, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
  ]);
  return members + pending + invites;
}

export async function getOrgSeatUsage(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        select: { planTier: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!org) return null;
  const [members, pending, invites] = await Promise.all([
    countOrgMembers(organizationId),
    countPendingMembershipRequests(organizationId),
    prisma.orgInvitation.count({
      where: { organizationId, status: "PENDING", expiresAt: { gt: new Date() } },
    }),
  ]);
  const cap = resolveOrgSeatCap(org, org.subscriptions[0] ?? null);
  const reserved = members + pending + invites;
  return {
    members,
    pending,
    invites,
    reserved,
    cap,
    remaining: cap == null ? null : Math.max(0, cap - reserved),
    requireMembershipApproval: org.requireMembershipApproval,
  };
}

type OrgForAccept = Pick<
  Organization,
  "id" | "status" | "validFrom" | "validUntil" | "maxSeats" | "requireMembershipApproval"
> & {
  subscriptions?: Pick<Subscription, "planTier">[];
};

/** 신규 요청/즉시가입 시 좌석 — 대기 건까지 포함해 예약 */
export async function canOrgReserveSeat(
  org: OrgForAccept,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const base = await canOrgAcceptMember(org);
  if (!base.ok) return base;

  const cap = resolveOrgSeatCap(org, org.subscriptions?.[0] ?? null);
  if (cap == null) return { ok: true };

  const reserved = await countReservedSeats(org.id);
  if (reserved >= cap) {
    return {
      ok: false,
      reason: `이 기관의 이용 인원 상한(${cap}명)에 도달했습니다. 대기·소속 인원을 합산한 좌석입니다.`,
    };
  }
  return { ok: true };
}

export async function getPendingRequestForUser(userId: string) {
  return prisma.orgMembershipRequest.findFirst({
    where: { userId, status: "PENDING" },
    include: {
      organization: {
        select: { id: true, name: true, kind: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type CreateMembershipRequestInput = {
  userId: string;
  organizationId?: string;
  joinCode?: string;
  message?: string | null;
};

export async function createMembershipRequest(input: CreateMembershipRequestInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new MembershipError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
  if (user.organizationId) {
    throw new MembershipError("ALREADY_MEMBER", "이미 소속된 기관이 있습니다.");
  }

  const existingPending = await getPendingRequestForUser(input.userId);
  if (existingPending) {
    throw new MembershipError(
      "PENDING_EXISTS",
      `이미 ${existingPending.organization.name} 승인 대기 중입니다. 취소 후 다시 신청하세요.`,
    );
  }

  let org =
    input.organizationId != null
      ? await prisma.organization.findUnique({
          where: { id: input.organizationId },
          include: {
            subscriptions: {
              where: { status: { not: "CANCELED" } },
              select: { planTier: true },
              take: 1,
              orderBy: { updatedAt: "desc" },
            },
          },
        })
      : null;

  if (!org && input.joinCode) {
    const code = input.joinCode.trim().toUpperCase();
    org = await prisma.organization.findUnique({
      where: { joinCode: code },
      include: {
        subscriptions: {
          where: { status: { not: "CANCELED" } },
          select: { planTier: true },
          take: 1,
          orderBy: { updatedAt: "desc" },
        },
      },
    });
  }

  if (!org) {
    throw new MembershipError("ORG_NOT_FOUND", "기관을 찾을 수 없거나 가입 코드가 올바르지 않습니다.");
  }

  const reserve = await canOrgReserveSeat(org);
  if (!reserve.ok) throw new MembershipError("SEAT_FULL", reserve.reason);

  // 승인 불필요(데모·레거시)면 즉시 소속
  if (!org.requireMembershipApproval) {
    await prisma.user.update({
      where: { id: input.userId },
      data: { organizationId: org.id, orgRole: "MEMBER" },
    });
    return {
      mode: "joined" as const,
      organization: { id: org.id, name: org.name },
      request: null,
    };
  }

  try {
    const request = await prisma.orgMembershipRequest.create({
      data: {
        organizationId: org.id,
        userId: input.userId,
        message: input.message?.trim() || null,
        status: "PENDING",
      },
      include: {
        organization: { select: { id: true, name: true, kind: true } },
      },
    });
    return {
      mode: "pending" as const,
      organization: { id: org.id, name: org.name },
      request,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new MembershipError("PENDING_EXISTS", "이미 이 기관에 승인 대기 중인 요청이 있습니다.");
    }
    throw e;
  }
}

export async function cancelMembershipRequest(requestId: string, userId: string) {
  const req = await prisma.orgMembershipRequest.findUnique({ where: { id: requestId } });
  if (!req || req.userId !== userId) {
    throw new MembershipError("NOT_FOUND", "요청을 찾을 수 없습니다.");
  }
  if (req.status !== "PENDING") {
    throw new MembershipError("NOT_PENDING", "대기 중인 요청만 취소할 수 있습니다.");
  }
  return prisma.orgMembershipRequest.update({
    where: { id: requestId },
    data: { status: "CANCELED", reviewedAt: new Date() },
  });
}

export async function approveMembershipRequest(
  requestId: string,
  reviewerId: string,
  opts?: { orgRole?: Extract<OrgRole, "MEMBER" | "STAFF"> },
) {
  const nextRole: OrgRole = opts?.orgRole === "STAFF" ? "STAFF" : "MEMBER";
  const req = await prisma.orgMembershipRequest.findUnique({
    where: { id: requestId },
    include: {
      organization: {
        include: {
          subscriptions: {
            where: { status: { not: "CANCELED" } },
            select: { planTier: true },
            take: 1,
            orderBy: { updatedAt: "desc" },
          },
        },
      },
      user: { select: { id: true, organizationId: true, name: true, email: true } },
    },
  });
  if (!req || req.status !== "PENDING") {
    throw new MembershipError("NOT_PENDING", "대기 중인 요청만 승인할 수 있습니다.");
  }
  if (req.user.organizationId) {
    await prisma.orgMembershipRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectReason: "이미 다른 기관에 소속됨",
      },
    });
    throw new MembershipError("ALREADY_MEMBER", "신청자가 이미 다른 기관에 소속되어 있습니다.");
  }

  // 승인 시점: 멤버 수만 재확인(이 요청은 아직 PENDING이라 reserved에 포함 — 자기 자신 제외 필요)
  if (!isOrgOperational(req.organization)) {
    throw new MembershipError("ORG_INACTIVE", "기관이 운영 중이 아니라 승인할 수 없습니다.");
  }
  const cap = resolveOrgSeatCap(req.organization, req.organization.subscriptions[0] ?? null);
  if (cap != null) {
    const members = await countOrgMembers(req.organizationId);
    if (members >= cap) {
      throw new MembershipError(
        "SEAT_FULL",
        `이용 인원 상한(${cap}명)에 도달해 승인할 수 없습니다.`,
      );
    }
  }

  const [updated] = await prisma.$transaction([
    prisma.orgMembershipRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: req.userId },
      data: { organizationId: req.organizationId, orgRole: nextRole },
    }),
  ]);

  return {
    request: updated,
    user: req.user,
    organization: { id: req.organization.id, name: req.organization.name },
    orgRole: nextRole,
  };
}

export async function rejectMembershipRequest(
  requestId: string,
  reviewerId: string,
  rejectReason?: string | null,
) {
  const req = await prisma.orgMembershipRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== "PENDING") {
    throw new MembershipError("NOT_PENDING", "대기 중인 요청만 거절할 수 있습니다.");
  }
  return prisma.orgMembershipRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      rejectReason: rejectReason?.trim() || null,
    },
  });
}

export async function removeOrgMember(organizationId: string, targetUserId: string, actorId: string) {
  if (targetUserId === actorId) {
    throw new MembershipError("SELF", "자신의 소속은 멤버 관리에서 해제할 수 없습니다.");
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || target.organizationId !== organizationId) {
    throw new MembershipError("NOT_FOUND", "소속 멤버를 찾을 수 없습니다.");
  }
  if (target.orgRole === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { organizationId, orgRole: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new MembershipError("LAST_ADMIN", "마지막 기관 관리자는 해제할 수 없습니다.");
    }
  }
  return prisma.user.update({
    where: { id: targetUserId },
    data: { organizationId: null, orgRole: "MEMBER" },
  });
}

/** 기관 ADMIN이 MEMBER/STUDENT ↔ STAFF 역할만 변경 (ADMIN 지정·해제 불가) */
export async function updateOrgMemberRole(
  organizationId: string,
  targetUserId: string,
  actorId: string,
  nextRole: Extract<OrgRole, "MEMBER" | "STAFF">,
) {
  if (targetUserId === actorId) {
    throw new MembershipError("SELF", "자신의 역할은 이 화면에서 변경할 수 없습니다.");
  }
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || target.organizationId !== organizationId) {
    throw new MembershipError("NOT_FOUND", "소속 멤버를 찾을 수 없습니다.");
  }
  if (target.orgRole === "ADMIN") {
    throw new MembershipError("ADMIN_PROTECTED", "기관 관리자 역할은 여기서 변경할 수 없습니다.");
  }
  if (nextRole !== "MEMBER" && nextRole !== "STAFF") {
    throw new MembershipError("INVALID_ROLE", "구성원 또는 담당자만 지정할 수 있습니다.");
  }
  return prisma.user.update({
    where: { id: targetUserId },
    data: { orgRole: nextRole },
  });
}

export async function leaveOrganization(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.organizationId) {
    throw new MembershipError("NOT_FOUND", "소속된 기관이 없습니다.");
  }
  if (user.orgRole === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { organizationId: user.organizationId, orgRole: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new MembershipError(
        "LAST_ADMIN",
        "마지막 기관 관리자는 탈퇴할 수 없습니다. 다른 관리자를 지정한 뒤 탈퇴하세요.",
      );
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: { organizationId: null, orgRole: "MEMBER" },
  });
}

export function membershipErrorResponse(e: unknown) {
  if (e instanceof MembershipError) {
    const status =
      e.code === "NOT_FOUND"
        ? 404
        : e.code === "SEAT_FULL" ||
            e.code === "PENDING_EXISTS" ||
            e.code === "ALREADY_MEMBER" ||
            e.code === "LAST_ADMIN"
          ? 409
          : 400;
    return { status, body: { error: e.message, code: e.code } };
  }
  console.error("[membership]", e);
  return { status: 500, body: { error: "처리 중 오류가 발생했습니다." } };
}

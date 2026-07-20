import { randomBytes } from "crypto";
import type { OrgRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth/password";
import { countOrgMembers, isOrgOperational, resolveOrgSeatCap } from "@/lib/org/contract";
import {
  MembershipError,
  canOrgReserveSeat,
  countReservedSeats,
} from "@/lib/org/membership";
import { sendEmail } from "@/lib/email/send";

const INVITE_TTL_DAYS = 14;

export function buildInviteAcceptUrl(token: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/org/invite/${token}`;
}

export async function listOrgInvitations(organizationId: string) {
  return prisma.orgInvitation.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      orgRole: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { name: true } },
    },
  });
}

export async function createOrgInvitations(input: {
  organizationId: string;
  invitedById: string;
  emails: string[];
  orgRole?: Extract<OrgRole, "MEMBER" | "STAFF">;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    include: {
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        select: { planTier: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!org) throw new MembershipError("ORG_NOT_FOUND", "기관을 찾을 수 없습니다.");

  const role: OrgRole = input.orgRole === "STAFF" ? "STAFF" : "MEMBER";
  const emails = [
    ...new Set(
      input.emails
        .map((e) => normalizeEmail(e))
        .filter((e) => e.includes("@")),
    ),
  ].slice(0, 100);

  if (emails.length === 0) {
    throw new MembershipError("INVALID", "유효한 이메일이 없습니다.");
  }

  // 좌석: 이번 배치를 한꺼번에 예약할 수 있는지 확인
  // (이미 대기 중인 동일 이메일은 재초대 시 교체되므로 이중 집계하지 않음)
  const cap = resolveOrgSeatCap(org, org.subscriptions[0] ?? null);
  if (cap != null) {
    const [reserved, alreadyPending] = await Promise.all([
      countReservedSeats(org.id),
      prisma.orgInvitation.count({
        where: {
          organizationId: org.id,
          status: "PENDING",
          expiresAt: { gt: new Date() },
          email: { in: emails },
        },
      }),
    ]);
    const netNew = Math.max(0, emails.length - alreadyPending);
    if (reserved + netNew > cap) {
      throw new MembershipError(
        "SEAT_FULL",
        `좌석 잔여 ${Math.max(0, cap - reserved)}석으로는 ${emails.length}명을 초대할 수 없습니다.`,
      );
    }
  } else {
    const reserve = await canOrgReserveSeat(org);
    if (!reserve.ok) throw new MembershipError("SEAT_FULL", reserve.reason);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const created: Array<{
    id: string;
    email: string;
    token: string;
    acceptUrl: string;
  }> = [];

  for (const email of emails) {
    // revoke previous pending for same email
    await prisma.orgInvitation.updateMany({
      where: { organizationId: org.id, email, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const token = randomBytes(18).toString("base64url");
    const row = await prisma.orgInvitation.create({
      data: {
        organizationId: org.id,
        email,
        token,
        invitedById: input.invitedById,
        orgRole: role,
        expiresAt,
      },
    });
    const acceptUrl = buildInviteAcceptUrl(token);
    created.push({ id: row.id, email, token, acceptUrl });

    void sendEmail({
      to: email,
      subject: `[${org.name}] 기관 초대`,
      text: `${org.name}에 초대되었습니다.\n\n아래 링크로 가입·수락하세요 (${INVITE_TTL_DAYS}일 유효):\n${acceptUrl}\n`,
    }).catch(() => undefined);
  }

  return { organization: { id: org.id, name: org.name }, invitations: created };
}

export async function revokeOrgInvitation(
  organizationId: string,
  invitationId: string,
) {
  const row = await prisma.orgInvitation.findFirst({
    where: { id: invitationId, organizationId },
  });
  if (!row) throw new MembershipError("NOT_FOUND", "초대를 찾을 수 없습니다.");
  if (row.status !== "PENDING") {
    throw new MembershipError("NOT_PENDING", "대기 중인 초대만 취소할 수 있습니다.");
  }
  return prisma.orgInvitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });
}

export async function getInvitationByToken(token: string) {
  return prisma.orgInvitation.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true, status: true, kind: true } },
    },
  });
}

/**
 * 초대 수락 — 로그인된 유저가 초대를 받아 소속된다 (초대 = 사전 승인).
 */
export async function acceptOrgInvitation(token: string, userId: string) {
  const invite = await prisma.orgInvitation.findUnique({
    where: { token },
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
    },
  });
  if (!invite || invite.status !== "PENDING") {
    throw new MembershipError("NOT_PENDING", "유효하지 않거나 이미 처리된 초대입니다.");
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    await prisma.orgInvitation.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new MembershipError("EXPIRED", "초대가 만료되었습니다. 재초대를 요청하세요.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new MembershipError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
  if (user.organizationId) {
    throw new MembershipError("ALREADY_MEMBER", "이미 소속된 기관이 있습니다.");
  }
  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    throw new MembershipError(
      "EMAIL_MISMATCH",
      `초대된 이메일(${invite.email})로 로그인한 뒤 수락해 주세요.`,
    );
  }

  // 초대는 이미 좌석을 예약 중이므로 멤버 상한만 재확인 (approveMembershipRequest와 동일)
  if (!isOrgOperational(invite.organization)) {
    throw new MembershipError("ORG_INACTIVE", "기관이 운영 중이 아니라 수락할 수 없습니다.");
  }
  const cap = resolveOrgSeatCap(invite.organization, invite.organization.subscriptions[0] ?? null);
  if (cap != null) {
    const members = await countOrgMembers(invite.organizationId);
    if (members >= cap) {
      throw new MembershipError(
        "SEAT_FULL",
        `이용 인원 상한(${cap}명)에 도달해 초대를 수락할 수 없습니다.`,
      );
    }
  }

  const role: OrgRole =
    invite.orgRole === "STAFF" || invite.orgRole === "ADMIN" ? invite.orgRole : "MEMBER";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: invite.organizationId,
        orgRole: role === "ADMIN" ? "MEMBER" : role,
      },
    }),
    prisma.orgInvitation.update({
      where: { id: invite.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedUserId: userId,
      },
    }),
  ]);

  return {
    organization: {
      id: invite.organization.id,
      name: invite.organization.name,
    },
    orgRole: role === "ADMIN" ? "MEMBER" : role,
  };
}

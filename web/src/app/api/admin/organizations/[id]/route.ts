import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { auditActor } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { generateJoinCode } from "@/lib/org/join-code";
import type { OrgStatus } from "@prisma/client";

function parseDateInput(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function orgSnapshot(org: {
  name: string;
  joinCode: string;
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
  maxSeats: number | null;
  adminNotes: string | null;
  saasPersonalizationEnabled: boolean;
}) {
  return {
    name: org.name,
    joinCode: org.joinCode,
    status: org.status,
    validFrom: org.validFrom?.toISOString() ?? null,
    validUntil: org.validUntil?.toISOString() ?? null,
    maxSeats: org.maxSeats,
    adminNotes: org.adminNotes,
    saasPersonalizationEnabled: org.saasPersonalizationEnabled,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, interviewKits: true } },
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      members: {
        where: { orgRole: "ADMIN" },
        select: { id: true, name: true, email: true },
        take: 3,
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ organization: org });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const before = orgSnapshot(org);

  const data: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "기관명을 2자 이상 입력해 주세요." }, { status: 400 });
    }
    data.name = name;
  }

  if (body.regenerateJoinCode === true) {
    let code = generateJoinCode();
    for (let i = 0; i < 8; i++) {
      const clash = await prisma.organization.findFirst({
        where: { joinCode: code, id: { not: id } },
      });
      if (!clash) break;
      code = generateJoinCode();
    }
    data.joinCode = code;
  } else if (typeof body.joinCode === "string") {
    const joinCode = body.joinCode.trim().toUpperCase();
    if (!joinCode) {
      return NextResponse.json({ error: "가입 코드를 입력해 주세요." }, { status: 400 });
    }
    const clash = await prisma.organization.findFirst({
      where: { joinCode, id: { not: id } },
    });
    if (clash) {
      return NextResponse.json({ error: "이미 사용 중인 가입 코드입니다." }, { status: 409 });
    }
    data.joinCode = joinCode;
  }

  if (body.status === "PENDING" || body.status === "APPROVED" || body.status === "REJECTED") {
    data.status = body.status as OrgStatus;
    if (body.status === "APPROVED") {
      data.approvedAt = new Date();
      data.rejectedAt = null;
    } else if (body.status === "REJECTED") {
      data.rejectedAt = new Date();
    }
  }

  const validFrom = parseDateInput(body.validFrom);
  const validUntil = parseDateInput(body.validUntil);
  if (validFrom !== undefined) data.validFrom = validFrom;
  if (validUntil !== undefined) data.validUntil = validUntil;

  if (body.maxSeats === null || body.maxSeats === "") {
    data.maxSeats = null;
  } else if (body.maxSeats !== undefined) {
    const n = typeof body.maxSeats === "number" ? body.maxSeats : Number(body.maxSeats);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "좌석 수는 1 이상이어야 합니다." }, { status: 400 });
    }
    data.maxSeats = Math.floor(n);
  }

  if (typeof body.adminNotes === "string") {
    data.adminNotes = body.adminNotes.trim() || null;
  }

  if (typeof body.saasPersonalizationEnabled === "boolean") {
    data.saasPersonalizationEnabled = body.saasPersonalizationEnabled;
    data.saasPersonalizationEnabledAt = body.saasPersonalizationEnabled ? new Date() : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  const updated = await prisma.organization.update({
    where: { id },
    data,
  });

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_UPDATE",
    entityType: "organization",
    entityId: id,
    summary: `기관 수정: ${updated.name}`,
    beforeState: before,
    afterState: orgSnapshot(updated),
  });

  return NextResponse.json({ organization: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!org) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const force = body.force === true;

  if (org._count.members > 0 && !force) {
    return NextResponse.json(
      {
        error: `소속 멤버 ${org._count.members}명이 있습니다. 삭제하려면 force=true로 다시 요청하세요.`,
        memberCount: org._count.members,
      },
      { status: 409 },
    );
  }

  const before = orgSnapshot(org);

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { organizationId: id },
      data: { organizationId: null, orgRole: "STUDENT" },
    }),
    prisma.organization.delete({ where: { id } }),
  ]);

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_DELETE",
    entityType: "organization",
    entityId: id,
    summary: `기관 삭제: ${org.name}`,
    beforeState: before,
  });

  return NextResponse.json({ ok: true });
}

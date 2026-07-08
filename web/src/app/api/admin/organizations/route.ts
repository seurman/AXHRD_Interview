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

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateJoinCode();
    const exists = await prisma.organization.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new Error("가입 코드를 생성하지 못했습니다.");
}

/** 슈퍼어드민 — 기관 목록(JSON) 또는 신규 생성 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { members: true } },
      subscriptions: {
        where: { status: { not: "CANCELED" } },
        select: { planTier: true, currentPeriodEnd: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      joinCode: o.joinCode,
      status: o.status,
      validFrom: o.validFrom?.toISOString() ?? null,
      validUntil: o.validUntil?.toISOString() ?? null,
      maxSeats: o.maxSeats,
      memberCount: o._count.members,
      subscription: o.subscriptions[0] ?? null,
      saasPersonalizationEnabled: o.saasPersonalizationEnabled,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "기관명을 2자 이상 입력해 주세요." }, { status: 400 });
  }

  const status: OrgStatus =
    body.status === "PENDING" || body.status === "REJECTED" ? body.status : "APPROVED";

  const joinCodeRaw = typeof body.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
  const joinCode = joinCodeRaw || (await uniqueJoinCode());

  const existingCode = await prisma.organization.findUnique({ where: { joinCode } });
  if (existingCode) {
    return NextResponse.json({ error: "이미 사용 중인 가입 코드입니다." }, { status: 409 });
  }

  const validFrom = parseDateInput(body.validFrom);
  const validUntil = parseDateInput(body.validUntil);
  if (validFrom === undefined || validUntil === undefined) {
    return NextResponse.json({ error: "이용 기간 형식이 올바르지 않습니다." }, { status: 400 });
  }

  let maxSeats: number | null = null;
  if (body.maxSeats === null || body.maxSeats === "") {
    maxSeats = null;
  } else if (typeof body.maxSeats === "number" && body.maxSeats > 0) {
    maxSeats = Math.floor(body.maxSeats);
  } else if (typeof body.maxSeats === "string" && body.maxSeats.trim()) {
    const n = Number(body.maxSeats);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "좌석 수는 1 이상이어야 합니다." }, { status: 400 });
    }
    maxSeats = Math.floor(n);
  }

  const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.trim() : null;
  const adminUserId = typeof body.adminUserId === "string" ? body.adminUserId.trim() : "";

  const now = new Date();
  const org = await prisma.organization.create({
    data: {
      name,
      joinCode,
      status,
      approvedAt: status === "APPROVED" ? now : null,
      rejectedAt: status === "REJECTED" ? now : null,
      validFrom: validFrom ?? (status === "APPROVED" ? now : null),
      validUntil,
      maxSeats,
      adminNotes: adminNotes || null,
      saasPersonalizationEnabled: body.saasPersonalizationEnabled === true,
      saasPersonalizationEnabledAt: body.saasPersonalizationEnabled === true ? now : null,
    },
  });

  if (adminUserId) {
    const target = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (target && !target.organizationId) {
      await prisma.user.update({
        where: { id: adminUserId },
        data: { organizationId: org.id, orgRole: "ADMIN" },
      });
    }
  }

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_CREATE",
    entityType: "organization",
    entityId: org.id,
    summary: `기관 생성: ${org.name}`,
    afterState: {
      name: org.name,
      joinCode: org.joinCode,
      status: org.status,
      validFrom: org.validFrom?.toISOString() ?? null,
      validUntil: org.validUntil?.toISOString() ?? null,
      maxSeats: org.maxSeats,
    },
  });

  return NextResponse.json({ organization: org }, { status: 201 });
}

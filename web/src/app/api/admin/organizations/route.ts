import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { auditActor } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import { generateJoinCode } from "@/lib/org/join-code";
import { resolveOrgPeriodForCreate } from "@/lib/org/period";
import { ORG_KIND_CONFIG, parseOrgKind } from "@/lib/org/kinds";
import { upsertOrgSubscription } from "@/lib/billing/org-subscription";
import { ORG_PLAN_TIERS } from "@/lib/billing/plans";
import type { OrgKind, OrgStatus, PlanTier, SubscriptionStatus } from "@prisma/client";

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateJoinCode();
    const exists = await prisma.organization.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new Error("가입 코드를 생성하지 못했습니다.");
}

function parseMaxSeats(body: Record<string, unknown>): { ok: true; value: number | null } | { ok: false; error: string } {
  if (body.maxSeats === null || body.maxSeats === "") {
    return { ok: true, value: null };
  }
  if (typeof body.maxSeats === "number" && body.maxSeats > 0) {
    return { ok: true, value: Math.floor(body.maxSeats) };
  }
  if (typeof body.maxSeats === "string" && body.maxSeats.trim()) {
    const n = Number(body.maxSeats);
    if (!Number.isFinite(n) || n < 1) {
      return { ok: false, error: "좌석 수는 1 이상이어야 합니다." };
    }
    return { ok: true, value: Math.floor(n) };
  }
  return { ok: true, value: null };
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
        select: { planTier: true, currentPeriodEnd: true, status: true },
        take: 1,
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
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

  const kind: OrgKind = parseOrgKind(body.kind) ?? "CAREER_CENTER";
  const kindPreset = ORG_KIND_CONFIG[kind];

  const joinCodeRaw = typeof body.joinCode === "string" ? body.joinCode.trim().toUpperCase() : "";
  const joinCode = joinCodeRaw || (await uniqueJoinCode());

  const existingCode = await prisma.organization.findUnique({ where: { joinCode } });
  if (existingCode) {
    return NextResponse.json({ error: "이미 사용 중인 가입 코드입니다." }, { status: 409 });
  }

  const periodResult = resolveOrgPeriodForCreate(
    { validFrom: body.validFrom, validUntil: body.validUntil },
    status,
  );
  if (!periodResult.ok) {
    return NextResponse.json({ error: periodResult.error }, { status: 400 });
  }

  const seatsResult = parseMaxSeats(body);
  if (!seatsResult.ok) {
    return NextResponse.json({ error: seatsResult.error }, { status: 400 });
  }

  const maxSeats = seatsResult.value ?? kindPreset.defaultMaxSeats;

  const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.trim() : null;
  const adminUserId = typeof body.adminUserId === "string" ? body.adminUserId.trim() : "";
  const adminUserEmail =
    typeof body.adminUserEmail === "string" ? body.adminUserEmail.trim().toLowerCase() : "";

  const saasPersonalizationEnabled =
    typeof body.saasPersonalizationEnabled === "boolean"
      ? body.saasPersonalizationEnabled
      : kindPreset.defaultSaas;

  let planTier: PlanTier | null = null;
  if (body.planTier === null || body.planTier === "" || body.planTier === "NONE") {
    planTier = null;
  } else if (typeof body.planTier === "string" && ORG_PLAN_TIERS.includes(body.planTier as PlanTier)) {
    planTier = body.planTier as PlanTier;
  } else if (status === "APPROVED") {
    planTier = kindPreset.defaultPlan;
  }

  const subscriptionMonths = Number(body.subscriptionMonths ?? 12);
  if (!Number.isFinite(subscriptionMonths) || subscriptionMonths < 1 || subscriptionMonths > 60) {
    return NextResponse.json({ error: "구독 기간은 1~60개월이어야 합니다." }, { status: 400 });
  }

  const subscriptionStatus: SubscriptionStatus =
    body.subscriptionStatus === "TRIALING" ? "TRIALING" : "ACTIVE";

  const now = new Date();
  const { validFrom, validUntil } = periodResult;

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name,
        kind,
        joinCode,
        status,
        approvedAt: status === "APPROVED" ? now : null,
        rejectedAt: status === "REJECTED" ? now : null,
        validFrom: validFrom ?? (status === "APPROVED" ? now : null),
        validUntil,
        maxSeats,
        adminNotes: adminNotes || null,
        saasPersonalizationEnabled,
        saasPersonalizationEnabledAt: saasPersonalizationEnabled ? now : null,
      },
    });

    let adminAssigned = false;
    let adminUser = adminUserId
      ? await tx.user.findUnique({ where: { id: adminUserId } })
      : null;

    if (!adminUser && adminUserEmail) {
      adminUser = await tx.user.findUnique({ where: { email: adminUserEmail } });
    }

    if (adminUser && !adminUser.organizationId) {
      await tx.user.update({
        where: { id: adminUser.id },
        data: { organizationId: org.id, orgRole: "ADMIN" },
      });
      adminAssigned = true;
    }

    let subscription = null;
    if (planTier && status === "APPROVED") {
      const periodEnd = validUntil ?? undefined;
      subscription = await upsertOrgSubscription(
        {
          organizationId: org.id,
          planTier,
          status: subscriptionStatus,
          months: subscriptionMonths,
          periodEnd,
        },
        tx,
      );
    }

    return { org, subscription, adminAssigned };
  });

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_CREATE",
    entityType: "organization",
    entityId: result.org.id,
    summary: `기관 생성: ${result.org.name} (${kindPreset.label})`,
    afterState: {
      name: result.org.name,
      kind: result.org.kind,
      joinCode: result.org.joinCode,
      status: result.org.status,
      validFrom: result.org.validFrom?.toISOString() ?? null,
      validUntil: result.org.validUntil?.toISOString() ?? null,
      maxSeats: result.org.maxSeats,
      planTier: result.subscription?.planTier ?? null,
      saasPersonalizationEnabled: result.org.saasPersonalizationEnabled,
      adminAssigned: result.adminAssigned,
    },
  });

  return NextResponse.json(
    {
      organization: result.org,
      subscription: result.subscription,
      adminAssigned: result.adminAssigned,
    },
    { status: 201 },
  );
}

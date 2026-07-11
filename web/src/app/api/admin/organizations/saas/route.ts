import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { auditActor } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    where: { status: "APPROVED" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      joinCode: true,
      saasPersonalizationEnabled: true,
      saasPersonalizationEnabledAt: true,
      _count: { select: { interviewKits: true, members: true } },
    },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      joinCode: o.joinCode,
      saasPersonalizationEnabled: o.saasPersonalizationEnabled,
      saasPersonalizationEnabledAt: o.saasPersonalizationEnabledAt?.toISOString() ?? null,
      kitCount: o._count.interviewKits,
      memberCount: o._count.members,
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await req.json()) as { organizationId?: string; enabled?: boolean };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId가 필요합니다." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled(boolean)가 필요합니다." }, { status: 400 });
  }

  const before = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, saasPersonalizationEnabled: true },
  });
  if (!before) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      saasPersonalizationEnabled: body.enabled,
      saasPersonalizationEnabledAt: body.enabled ? new Date() : null,
    },
    select: {
      id: true,
      name: true,
      saasPersonalizationEnabled: true,
      saasPersonalizationEnabledAt: true,
    },
  });

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_UPDATE",
    entityType: "organization",
    entityId: organizationId,
    summary: `[${org.name}] SaaS 개인화 권한 ${body.enabled ? "부여" : "회수"}`,
    beforeState: { saasPersonalizationEnabled: before.saasPersonalizationEnabled },
    afterState: { saasPersonalizationEnabled: org.saasPersonalizationEnabled },
  });

  return NextResponse.json({
    ok: true,
    organization: {
      id: org.id,
      name: org.name,
      saasPersonalizationEnabled: org.saasPersonalizationEnabled,
      saasPersonalizationEnabledAt: org.saasPersonalizationEnabledAt?.toISOString() ?? null,
    },
  });
}

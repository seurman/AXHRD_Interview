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
      diagnosticEnabled: true,
      _count: { select: { diagnosticWaves: true, members: true } },
    },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      joinCode: o.joinCode,
      diagnosticEnabled: o.diagnosticEnabled,
      waveCount: o._count.diagnosticWaves,
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
    select: { id: true, name: true, diagnosticEnabled: true },
  });
  if (!before) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: { diagnosticEnabled: body.enabled },
    select: {
      id: true,
      name: true,
      diagnosticEnabled: true,
    },
  });

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_UPDATE",
    entityType: "organization",
    entityId: organizationId,
    summary: `[${org.name}] 조직진단(ARC) entitlement ${body.enabled ? "활성화" : "비활성화"}`,
    beforeState: { diagnosticEnabled: before.diagnosticEnabled },
    afterState: { diagnosticEnabled: org.diagnosticEnabled },
  });

  return NextResponse.json({
    ok: true,
    organization: {
      id: org.id,
      name: org.name,
      diagnosticEnabled: org.diagnosticEnabled,
    },
  });
}

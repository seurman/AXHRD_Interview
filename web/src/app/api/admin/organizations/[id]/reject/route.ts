import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { auditActor } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }

  const before = {
    status: org.status,
    approvedAt: org.approvedAt?.toISOString() ?? null,
    rejectedAt: org.rejectedAt?.toISOString() ?? null,
  };

  const updated = await prisma.organization.update({
    where: { id },
    data: { status: "REJECTED", rejectedAt: new Date(), approvedAt: null },
  });

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_REJECT",
    entityType: "organization",
    entityId: id,
    summary: `기관 반려: ${org.name}`,
    beforeState: before,
    afterState: {
      status: updated.status,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
      approvedAt: null,
    },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

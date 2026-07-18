import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { auditActor } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  entitlementDbPatch,
  readOrgEntitlements,
  type OrgProductKey,
} from "@/lib/org/entitlements";

const PRODUCT_KEYS: OrgProductKey[] = ["interview", "competency", "diagnostic", "assessment"];

function isProductKey(value: unknown): value is OrgProductKey {
  return typeof value === "string" && PRODUCT_KEYS.includes(value as OrgProductKey);
}

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
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      saasPersonalizationEnabledAt: true,
      diagnosticEnabled: true,
      assessmentEnabled: true,
    },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      joinCode: o.joinCode,
      entitlements: readOrgEntitlements(o),
      competencyEnabledAt: o.saasPersonalizationEnabledAt?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await req.json()) as {
    organizationId?: string;
    product?: string;
    enabled?: boolean;
  };

  const organizationId = typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId가 필요합니다." }, { status: 400 });
  }
  if (!isProductKey(body.product)) {
    return NextResponse.json(
      { error: "product는 interview | competency | diagnostic | assessment 중 하나여야 합니다." },
      { status: 400 },
    );
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled(boolean)가 필요합니다." }, { status: 400 });
  }

  const before = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      saasPersonalizationEnabledAt: true,
      diagnosticEnabled: true,
      assessmentEnabled: true,
    },
  });
  if (!before) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }
  const beforeEntitlements = readOrgEntitlements(before);

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: entitlementDbPatch(body.product, body.enabled),
    select: {
      id: true,
      name: true,
      interviewEnabled: true,
      saasPersonalizationEnabled: true,
      saasPersonalizationEnabledAt: true,
      diagnosticEnabled: true,
      assessmentEnabled: true,
    },
  });
  const afterEntitlements = readOrgEntitlements(org);

  await logAdminAudit({
    actor: auditActor(user),
    action: "ORG_UPDATE",
    entityType: "organization",
    entityId: organizationId,
    summary: `[${org.name}] ${body.product} entitlement ${body.enabled ? "활성화" : "비활성화"}`,
    beforeState: { entitlements: beforeEntitlements },
    afterState: { entitlements: afterEntitlements },
  });

  return NextResponse.json({
    ok: true,
    organization: {
      id: org.id,
      name: org.name,
      entitlements: afterEntitlements,
      competencyEnabledAt: org.saasPersonalizationEnabledAt?.toISOString() ?? null,
    },
  });
}

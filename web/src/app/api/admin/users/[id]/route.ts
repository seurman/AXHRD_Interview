import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import {
  canGrantPlatformRoles,
  hasSuperadminAccess,
  isSuperadmin,
} from "@/lib/auth/guards";
import { auditActor } from "@/lib/admin/auth";
import { logAdminAudit } from "@/lib/admin/audit";

const VALID_ROLES = ["STUDENT", "STAFF", "ADMIN"] as const;
const VALID_PLATFORM_ROLES = ["NONE", "ADMIN", "CONTENT_ADMIN", "SUPERADMIN"] as const;
type OrgRoleValue = (typeof VALID_ROLES)[number];
type PlatformRoleValue = (typeof VALID_PLATFORM_ROLES)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canGrantPlatformRoles(currentUser)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const rawRole = body.orgRole;
  const rawOrgId = body.organizationId;
  let rawPlatformRole = body.platformRole as PlatformRoleValue | undefined;

  if (rawRole !== undefined && !VALID_ROLES.includes(rawRole)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
  }
  if (rawPlatformRole !== undefined && !VALID_PLATFORM_ROLES.includes(rawPlatformRole)) {
    return NextResponse.json({ error: "유효하지 않은 플랫폼 권한입니다." }, { status: 400 });
  }

  // UI/API에서 SUPERADMIN 승격은 환경변수 부트스트랩 이메일만 허용
  if (
    rawPlatformRole === "SUPERADMIN" &&
    !isSuperadmin(target.email) &&
    !isSuperadmin(currentUser.email)
  ) {
    return NextResponse.json(
      { error: "SUPERADMIN은 SUPERADMIN_EMAILS 등록 계정만 부여할 수 있습니다." },
      { status: 403 }
    );
  }

  // 레거시 CONTENT_ADMIN → ADMIN 저장
  if (rawPlatformRole === "CONTENT_ADMIN") {
    rawPlatformRole = "ADMIN";
  }

  // 자기 자신의 SUPERADMIN을 내릴 수 없음
  if (
    target.id === currentUser.id &&
    hasSuperadminAccess(target) &&
    rawPlatformRole !== undefined &&
    rawPlatformRole !== "SUPERADMIN"
  ) {
    return NextResponse.json(
      { error: "본인의 SUPERADMIN 권한은 스스로 내릴 수 없습니다." },
      { status: 400 }
    );
  }

  let organizationId: string | null | undefined = undefined;
  if (rawOrgId !== undefined) {
    if (rawOrgId === null || rawOrgId === "") {
      organizationId = null;
    } else {
      const org = await prisma.organization.findUnique({ where: { id: rawOrgId } });
      if (!org) {
        return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
      }
      organizationId = org.id;
    }
  }

  const resultingOrgId =
    organizationId !== undefined ? organizationId : target.organizationId;
  let resultingRole: OrgRoleValue =
    (rawRole as OrgRoleValue | undefined) ?? (target.orgRole as OrgRoleValue);

  if (!resultingOrgId) {
    resultingRole = "STUDENT";
  }

  const beforeUser = {
    platformRole: target.platformRole,
    orgRole: target.orgRole,
    organizationId: target.organizationId,
  };

  const updated = await prisma.user.update({
    where: { id },
    data: {
      orgRole: resultingRole,
      organizationId: resultingOrgId,
      ...(rawPlatformRole !== undefined ? { platformRole: rawPlatformRole } : {}),
    },
  });

  if (
    rawPlatformRole !== undefined &&
    rawPlatformRole !== target.platformRole
  ) {
    await logAdminAudit({
      actor: auditActor(currentUser),
      action: "ROLE_GRANT",
      entityType: "user",
      entityId: id,
      summary: `플랫폼 권한 변경: ${target.email} → ${rawPlatformRole}`,
      beforeState: beforeUser,
      afterState: {
        platformRole: updated.platformRole,
        orgRole: updated.orgRole,
        organizationId: updated.organizationId,
      },
    });
  }

  return NextResponse.json({
    id: updated.id,
    orgRole: updated.orgRole,
    organizationId: updated.organizationId,
    platformRole: updated.platformRole,
  });
}

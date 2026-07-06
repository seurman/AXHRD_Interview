import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";

const VALID_ROLES = ["STUDENT", "STAFF", "ADMIN"] as const;
const VALID_PLATFORM_ROLES = ["NONE", "CONTENT_ADMIN", "SUPERADMIN"] as const;
type OrgRoleValue = (typeof VALID_ROLES)[number];
type PlatformRoleValue = (typeof VALID_PLATFORM_ROLES)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !hasSuperadminAccess(currentUser)) {
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
  const rawPlatformRole = body.platformRole;

  if (rawRole !== undefined && !VALID_ROLES.includes(rawRole)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
  }
  if (rawPlatformRole !== undefined && !VALID_PLATFORM_ROLES.includes(rawPlatformRole)) {
    return NextResponse.json({ error: "유효하지 않은 플랫폼 권한입니다." }, { status: 400 });
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

  const updated = await prisma.user.update({
    where: { id },
    data: {
      orgRole: resultingRole,
      organizationId: resultingOrgId,
      ...(rawPlatformRole !== undefined
        ? { platformRole: rawPlatformRole as PlatformRoleValue }
        : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    orgRole: updated.orgRole,
    organizationId: updated.organizationId,
    platformRole: updated.platformRole,
  });
}

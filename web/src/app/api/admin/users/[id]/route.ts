import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperadmin } from "@/lib/auth/guards";

const VALID_ROLES = ["STUDENT", "STAFF", "ADMIN"] as const;
type OrgRoleValue = (typeof VALID_ROLES)[number];

/** 슈퍼어드민이 특정 사용자의 orgRole·소속 기관을 변경한다.
 *  - orgRole을 STAFF/ADMIN으로 두려면 소속 기관이 있어야 한다(요청에 없으면 기존 값 사용).
 *  - organizationId를 null로 보내면 소속을 해제하고 자동으로 orgRole도 STUDENT로 되돌린다. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isSuperadmin(currentUser.email)) {
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

  if (rawRole !== undefined && !VALID_ROLES.includes(rawRole)) {
    return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
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

  // 소속 기관이 없는데 STAFF/ADMIN일 수는 없다 — 소속 해제 시 자동으로 STUDENT로.
  if (!resultingOrgId) {
    resultingRole = "STUDENT";
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      orgRole: resultingRole,
      organizationId: resultingOrgId,
    },
  });

  return NextResponse.json({
    id: updated.id,
    orgRole: updated.orgRole,
    organizationId: updated.organizationId,
  });
}

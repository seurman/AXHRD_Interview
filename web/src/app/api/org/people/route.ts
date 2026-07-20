import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser, isOrgStaffUser, type RoleUser } from "@/lib/auth/roles";
import { getOrgPeopleDashboard } from "@/lib/org/people-dashboard";

function canView(user: RoleUser) {
  return !!user.organizationId && (isOrgAdminUser(user) || isOrgStaffUser(user));
}

/** 기관 구성원 현황 요약 + 명단 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canView(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }

  const data = await getOrgPeopleDashboard(user.organizationId!);
  if (!data) {
    return NextResponse.json({ error: "기관을 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(data);
}

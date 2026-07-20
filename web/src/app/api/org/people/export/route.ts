import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isOrgAdminUser, isOrgStaffUser, type RoleUser } from "@/lib/auth/roles";
import { getOrgPeopleDashboard } from "@/lib/org/people-dashboard";
import { ORG_ROLE_LABEL } from "@/lib/auth/roles";

function canCoach(user: RoleUser) {
  return !!user.organizationId && (isOrgAdminUser(user) || isOrgStaffUser(user));
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** GET /api/org/people/export — 구성원 명단 CSV */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canCoach(user)) {
    return NextResponse.json({ error: "기관 담당자 권한이 필요합니다." }, { status: 403 });
  }

  const data = await getOrgPeopleDashboard(user.organizationId!);
  if (!data) {
    return NextResponse.json({ error: "기관 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const headers = [
    "이름",
    "이메일",
    "역할",
    "상세동의",
    "완료면접",
    "진행면접",
    "평균백분위",
    "향상도",
    "최근면접",
    "최근로그인",
    "온라인",
    "가입일",
  ];

  const lines = [
    headers.join(","),
    ...data.members.map((m) =>
      [
        csvEscape(m.name),
        csvEscape(m.email),
        csvEscape(ORG_ROLE_LABEL[m.orgRole] ?? m.orgRole),
        csvEscape(m.coachingConsent ? "Y" : "N"),
        csvEscape(m.completedInterviews),
        csvEscape(m.inProgressInterviews),
        csvEscape(m.avgPercentile),
        csvEscape(m.deltaPercentile),
        csvEscape(m.lastInterviewAt),
        csvEscape(m.lastLoginAt),
        csvEscape(m.online ? "Y" : "N"),
        csvEscape(m.joinedAt),
      ].join(","),
    ),
  ];

  const bom = "\uFEFF";
  const filename = `org-people-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(bom + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

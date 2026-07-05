import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getCohortData } from "@/lib/org/cohort";

/** 기관 담당자(STAFF/ADMIN)용 코호트 집계 조회. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.orgRole === "STUDENT" || !user.organizationId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const data = await getCohortData(user.organizationId);
  if (!data) {
    return NextResponse.json({ error: "기관 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(data);
}

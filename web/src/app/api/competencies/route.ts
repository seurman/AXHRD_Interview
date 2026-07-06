import { NextResponse } from "next/server";
import { getActiveCompetencies } from "@/lib/competency/bank";
import { getCurrentUser } from "@/lib/auth/session";

/** 로그인 사용자용 활성 역량 목록 (면접 설정 화면) */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const competencies = await getActiveCompetencies();
  return NextResponse.json({ competencies });
}

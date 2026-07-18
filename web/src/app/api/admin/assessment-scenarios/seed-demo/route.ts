import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { prismaDirect } from "@/lib/prisma-direct";
import { seedEvidenceAssessment } from "@/lib/demo/seed-evidence-assessment";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** 운영 DB에 역량평가 데모 과제 2종(역할연기·서류함)을 게시 상태로 시드 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  if (process.env.VERCEL && !process.env.DIRECT_URL?.trim()) {
    return NextResponse.json(
      {
        error:
          "Vercel에 DIRECT_URL(Supabase Session pooler, 5432) 환경변수가 없습니다. Settings → Environment Variables에 추가 후 재배포하세요.",
      },
      { status: 503 },
    );
  }

  try {
    const summary = await seedEvidenceAssessment(prismaDirect);
    return NextResponse.json({
      ok: true,
      ...summary,
      message:
        "데모 과제 시드 완료: 저성과 팀원 면담(역할연기), 신임 팀장 서류함. /assessment 에서 확인할 수 있습니다.",
    });
  } catch (e) {
    console.error("[admin/assessment-scenarios/seed-demo]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "데모 시드 실패" },
      { status: 500 },
    );
  } finally {
    await prismaDirect.$disconnect();
  }
}

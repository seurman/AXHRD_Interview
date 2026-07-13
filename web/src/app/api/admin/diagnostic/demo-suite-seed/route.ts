import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { prismaDirect } from "@/lib/prisma-direct";
import { runDemoSuite } from "@/lib/demo/run-demo-suite";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 운영 DB 통합 시연 시드 (npm run db:seed:demo 동일) — DIRECT_URL 연결 */
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
    const summary = await runDemoSuite(prismaDirect);
    return NextResponse.json({
      ok: true,
      ...summary,
      message: "통합 시연 시드 완료. docs/DEMO_SCRIPT.md 계정으로 확인하세요.",
    });
  } catch (e) {
    console.error("[admin/diagnostic/demo-suite-seed]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "통합 시드 실패" },
      { status: 500 },
    );
  } finally {
    await prismaDirect.$disconnect();
  }
}

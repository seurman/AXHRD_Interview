import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { syncArcIndexFromSeed } from "@/lib/diagnostic/instrument-sync";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const result = await syncArcIndexFromSeed(prisma);
    return NextResponse.json({
      ok: true,
      instrumentId: result.instrumentId,
      version: result.version,
      versionBumped: result.versionBumped,
      stats: result.stats,
      message: result.created
        ? "ARC Index 문항뱅크가 등록되었습니다."
        : result.versionBumped
          ? `원본과 동기화했습니다. 버전이 ${result.version}(으)로 갱신되었습니다.`
          : "원본과 이미 일치합니다. 변경 사항 없음.",
    });
  } catch (e) {
    console.error("[admin/diagnostic/seed]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "동기화 실패" },
      { status: 500 },
    );
  }
}

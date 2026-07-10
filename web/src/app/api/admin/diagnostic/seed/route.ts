import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSuperadminAccess } from "@/lib/auth/guards";
import { seedArcIndex } from "@/lib/diagnostic/seed-arc-index";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || !hasSuperadminAccess(user)) {
    return NextResponse.json({ error: "슈퍼어드민 권한이 필요합니다." }, { status: 403 });
  }

  try {
    const instrumentId = await seedArcIndex(
      (await import("@/lib/prisma")).prisma,
    );
    return NextResponse.json({ ok: true, instrumentId, message: "ARC Index 문항뱅크가 준비되었습니다." });
  } catch (e) {
    console.error("[admin/diagnostic/seed]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "시드 실행 실패" },
      { status: 500 },
    );
  }
}

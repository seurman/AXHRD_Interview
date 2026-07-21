import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listPathOverview, resolveUserTrack } from "@/lib/learning/path";
import { checkUsageLimit } from "@/lib/billing/usage";

/**
 * 오늘/이번 주 추천 드릴 — 스트릭이 낮거나 다음 레슨이 있는 역량 우선
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const track = await resolveUserTrack(user.id);
  const [overview, usage] = await Promise.all([
    listPathOverview(user.id, track),
    checkUsageLimit(user.id, "daily_drill"),
  ]);

  const sorted = [...overview].sort((a, b) => {
    if (Boolean(a.nextLesson) !== Boolean(b.nextLesson)) {
      return a.nextLesson ? -1 : 1;
    }
    return a.masteryScore - b.masteryScore;
  });

  const recommendation = sorted.find((c) => c.nextLesson) ?? sorted[0] ?? null;

  return NextResponse.json({
    track,
    allowed: usage.allowed,
    usage,
    recommendation,
    competencies: sorted,
  });
}

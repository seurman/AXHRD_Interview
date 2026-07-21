import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listPathOverview, resolveUserTrack } from "@/lib/learning/path";
import { recommendWeaknessDrill } from "@/lib/learning/weakness";
import { checkUsageLimit } from "@/lib/billing/usage";

/**
 * 오늘/이번 주 추천 드릴 — 약점(6축·숙련) + 다음 레슨 우선
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const track = await resolveUserTrack(user.id);
  const [overview, usage, weakness] = await Promise.all([
    listPathOverview(user.id, track),
    checkUsageLimit(user.id, "daily_drill"),
    recommendWeaknessDrill(user.id),
  ]);

  const sorted = [...overview].sort((a, b) => {
    if (a.competency === weakness.competency) return -1;
    if (b.competency === weakness.competency) return 1;
    if (Boolean(a.nextLesson) !== Boolean(b.nextLesson)) {
      return a.nextLesson ? -1 : 1;
    }
    return a.masteryScore - b.masteryScore;
  });

  const recommendation =
    sorted.find((c) => c.competency === weakness.competency) ??
    sorted.find((c) => c.nextLesson) ??
    sorted[0] ??
    null;

  return NextResponse.json({
    track,
    allowed: usage.allowed,
    usage,
    weakness,
    recommendation,
    competencies: sorted,
  });
}

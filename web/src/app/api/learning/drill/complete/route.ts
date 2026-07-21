import { NextResponse } from "next/server";
import type { CareerTrack } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/session";
import { checkUsageLimit } from "@/lib/billing/usage";
import { completeLesson, resolveUserTrack } from "@/lib/learning/path";

const TRACKS: CareerTrack[] = ["NEW_GRAD", "EXPERIENCED"];

/** 레슨/퀴즈 완료 — 저원가 드릴 한도 적용 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const usage = await checkUsageLimit(user.id, "daily_drill");
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.message,
        upgradeUrl: usage.upgradeUrl,
        used: usage.used,
        limit: usage.limit,
      },
      { status: 402 },
    );
  }

  const body = (await req.json()) as {
    lessonId?: string;
    track?: CareerTrack;
    quizScore?: number;
  };

  if (!body.lessonId) {
    return NextResponse.json({ error: "lessonId가 필요합니다." }, { status: 400 });
  }

  const track =
    body.track && TRACKS.includes(body.track)
      ? body.track
      : await resolveUserTrack(user.id);

  try {
    const result = await completeLesson({
      userId: user.id,
      lessonId: body.lessonId,
      track,
      quizScore: body.quizScore,
    });
    return NextResponse.json({ ok: true, ...result, usage });
  } catch (e) {
    const message = e instanceof Error ? e.message : "레슨 완료에 실패했습니다.";
    const status = message.includes("해금") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
